// Màn Chuẩn bị ca — "sảnh chính" ngoài ca (M5 Đợt 3, gói M-A, bản 0.5.2; theo đặc tả sảnh PA1 "Cảnh phố sống động").
// Bố cục từ trên xuống:
//  1. Thanh gỗ dính đầu màn (.prep-toprow): biển tên xe, Muỗng Vàng, nút "?".
//  2. Cảnh phố (.ps-scene): mái bạt theo màu dù đang dùng, biển ngày treo (Ngày N, chặng, ba con số Tiền quán / danh
//     tiếng / sao bằng hình, huy hiệu sự kiện ngày có dấu "!" / "✓"), xe đẩy chính là bảng lối vào (7 đồ vật to có nhãn
//     và chấm đỏ: Chợ Công Thức, Việc hôm nay, Điểm danh, Hộp thư trên mặt quầy; Sổ công thức, Sổ tay nghề, Cài đặt trong
//     hộc xe), Dì Sáu bán thân trên vỉa hè với bong bóng lời dặn; có thưởng chờ nhận ngay ở sảnh (bước chuỗi, quà sự
//     kiện) thì hộp quà có số dán ở góc bong bóng (testid prep-gift, bấm → cuộn tới thẻ có nút nhận).
//  3. Các tấm theo nhịp ngày: dải nhắc (lùi giờ, bản mới, sao lưu) → thiệp lễ → tờ thông báo sự kiện ngày + lựa chọn →
//     vé Phiếu Chợ Sớm → gánh hàng quê → sổ chuỗi "Dì Sáu dặn" → nợ / mượn Dì Sáu → bảng gỗ "Hôm nay" (dự báo khách
//     bằng hàng đầu khách + số to, thực đơn bằng hình món có đĩa giá) → kho hàng hiếm → Giấc mơ tiếp theo → Mẹo nghề.
//     Ngày 1 (lần mở đầu tiên): sổ chuỗi lên ngay dưới cảnh; chưa có gánh hàng, kho hiếm, Giấc mơ.
//  4. Nút "Mở hàng" dính đáy (.sticky-foot): biển treo đỏ có hình xe, nảy nhẹ MỘT lần khi vào màn.
// Hiệu ứng chỉ kích theo sự kiện (bấm nhận thưởng chuỗi, mượn tiền, chọn lựa chọn, dùng phiếu), chạy SAU render() trên
// phần tử mới, qua app.vfx (tự theo "Giảm chuyển động"); render() không phát hoạt ảnh, sảnh không có hoạt ảnh lặp.
// Vào màn: cập nhật meta theo ngày thật; lần đầu trong ngày thật (kể cả lần mở game đầu tiên) → bảng điểm danh.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { DI_SAU_POSES, DI_SAU_FACES, HEADS, bust } from '../art/people.js'
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
import { formatVND, formatStars, formatMoneyShort, formatK } from '../format.js'
import { spoonPill, reasonText, progressBar, redDot, rewindNote, durationText, cartOptions, celebrateReward } from '../components/meta-ui.js'
import { chainCard } from '../components/chain-card.js'
import { openCheckin } from '../components/checkin-popup.js'
import { phaseText } from './event.js'
import { backupDue } from '../../core/save.js'
import { notebookBadge, randomSeenTip } from '../../core/notebook.js'
import { incidentBonusFor, pendingDebts } from '../../core/incidents.js'
import { stallStatus, rareOverview, rarePortions, rareConfig } from '../../core/rare.js'
import { starText } from './market.js'
import { helpButton } from '../components/help.js'
import { isReduced } from '../motion.js'

function pickRandom(arr) {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null
}

// Loại của từng dòng ảnh hưởng sự kiện ngày (trường kind của dayEffectItems).
export const DAY_EFFECT_KINDS = Object.freeze(['khach', 'kien_nhan', 'goi_them', 'mon', 'chi_phi', 'gia_von', 'loa', 'hang_cho', 'giai', 'kiem_tra', 'gio_cho', 'ghi_chu'])

// Hiệu ứng của sự kiện ngày thành các dòng ngắn cho người chơi, mỗi dòng kèm loại và id hình (chuỗi, KHÔNG phải SVG —
// hàm thuần): { kind, text, art }. art: id hình meta.js / SCENE_ICONS / icon() của art.js, hoặc 'nguoi_vui' /
// 'nguoi_buc' (đầu khách ở people.js), null = không hình (chấm vàng). Màn Chuẩn bị vẽ viên có hình; chữ giống hệt
// dayEffectLines.
// M4: thêm dòng cho chi phí cố định tăng, giá nguyên liệu tăng, Loa báo tiền tắt, luật hàng chờ, đơn đặt trước, chấm
// cuối ca (hội thi, tài trợ, kiểm tra vệ sinh), lượt Giỏ chợ.
export function dayEffectItems(effects, data, state = null) {
  const e = effects || {}
  const R = data.RECIPES || {}
  const ING = data.INGREDIENTS || {}
  const out = []
  const add = (kind, text, art = null) => out.push({ kind, text, art })
  const pct = v => Math.round(Math.abs(v - 1) * 100) + '%'
  const owned = id => R[id] && (!state || (state.recipes && state.recipes[id]))
  const stars = v => String(v).replace('.', ',')
  const recipeArt = id => (R[id] && R[id].icon) || id
  if (e.customerMul && e.customerMul < 1) add('khach', `Khách ít hơn khoảng ${pct(e.customerMul)}`, 'nguoi_vui')
  if (e.customerMul && e.customerMul > 1) add('khach', `Khách đông hơn khoảng ${pct(e.customerMul)}, ca dài hơn`, 'nguoi_vui')
  if (e.extraCustomers) add('khach', `Thêm ${e.extraCustomers} khách`, 'nguoi_vui')
  if (e.patienceMul && e.patienceMul > 1) add('kien_nhan', `Khách chịu chờ lâu hơn ${pct(e.patienceMul)}`, 'hud_gio')
  // M4: Ngày lãnh lương không còn nhân tip, khách gọi thêm món (luật tip không có ngoại lệ)
  if (Array.isArray(e.lineCountWeights)) add('goi_them', 'Khách hay gọi thêm món, hóa đơn dễ qua 20.000đ để có tip', 'dong_xu')
  // chỉ kể món đang bán (có state thì lọc món đã sở hữu)
  const rw = Object.entries(e.recipeWeight || {}).filter(([id]) => owned(id))
  const hot = rw.filter(([, w]) => w > 1).map(([id]) => id)
  const cold = rw.filter(([, w]) => w < 1).map(([id]) => id)
  if (hot.length) add('mon', `${hot.map(id => R[id].name).join(', ')} được gọi nhiều gấp đôi`, recipeArt(hot[0]))
  if (cold.length) add('mon', `${cold.map(id => R[id].name).join(', ')} ít được gọi hơn (món có đá)`, recipeArt(cold[0]))
  // M4: chi phí, giá vốn
  if (Number(e.fixedCostDelta) > 0) {
    const base = Number(data.BALANCE && data.BALANCE.fixedCostPerShift) || 20000
    add('chi_phi', `Chi phí cố định ca này ${formatVND(base)} → ${formatVND(base + Number(e.fixedCostDelta))}`, 'xu')
  }
  for (const [ing, mul] of Object.entries(e.ingCostMul || {})) {
    if (!(Number(mul) > 1) || !ING[ing]) continue
    const per = Object.values(R).filter(r => owned(r.id)).map(r => {
      const it = (r.ingredients || []).find(i => i.id === ing && i.role !== 'tuy_chon')
      return it ? { name: r.name, extra: Math.round((ING[ing].cost || 0) * (it.qty || 1) * (Number(mul) - 1)) } : null
    }).filter(Boolean)
    const times = Number(mul) === 2 ? 'gấp đôi' : `×${String(mul).replace('.', ',')}`
    add('gia_von', `Giá ${ING[ing].name.toLocaleLowerCase('vi-VN')} ${times}` +
      (per.length ? `: ${per.map(x => `${x.name} tốn thêm khoảng ${formatVND(x.extra)} mỗi phần`).join(', ')}` : '') +
      ' (phần tăng có mức trần)', ING[ing].icon || ing)
  }
  if (e.noQrSpeaker && state && state.upgrades && state.upgrades.loa_bao_tien) add('loa', 'Loa báo tiền tắt: tự xem tiền về đúng số rồi mới bấm xác nhận', 'khau_thanh_toan')
  // M4: hàng chờ
  if (e.queueFine) add('hang_cho', `Hàng chờ chạm ${e.queueFine.at} người thì bị phạt tối đa ${formatVND(e.queueFine.fine)} (1 lần)`, 'nguoi_buc')
  if (Number(e.queueMax) > 0) add('hang_cho', `Chỉ cho ${e.queueMax} người đứng chờ, người đến sau sẽ đi ngang`, 'nguoi_buc')
  // M4: đơn đặt trước
  const bo = e.bigOrder
  if (bo && R[bo.recipeId]) {
    const qty = Number(bo.qty) || 1
    add('khach', `Thêm 1 khách lấy ${qty} ly ${R[bo.recipeId].name} (${formatVND((R[bo.recipeId].price || 0) * qty)})` +
      (Number(bo.bonus) > 0 ? `, giao đạt từ ${bo.minStars} sao được thêm ${formatVND(bo.bonus)}` : ''), 'nguoi_vui')
  }
  // M4: chấm cuối ca. Tiền thưởng có trần theo doanh thu dự kiến của ca (ca ít khách nhận ít hơn) nên ghi "tối đa",
  // giống dòng phạt; dòng cuối nói rõ vì sao.
  const E = e.endCheck
  let capNote = false
  if (E && E.type === 'stars') {
    for (const t of E.tiers || []) {
      add('giai', `Sao trung bình của ca từ ${stars(t.min)}: ${t.label || 'có giải'}` +
        (t.money ? ` tối đa +${formatVND(t.money)}` : '') + (t.rep ? `, +${t.rep} danh tiếng` : ''), 'cup')
      if (t.money) capNote = true
    }
  } else if (E && E.type === 'portions') {
    const names = (E.recipes || []).filter(id => R[id]).map(id => R[id].name).join(', ')
    const tiers = (E.tiers || []).slice().sort((a, b) => b.min - a.min)
    if (tiers.length) {
      add('giai', tiers.map((t, i) => (i === 0 ? `Bán từ ${t.min} ly ${names}: tối đa +${formatVND(t.money)}` : `ít hơn: +${formatVND(t.money)}`)).join('; '), 'cup')
      capNote = true
    }
  } else if (E && E.type === 'hygiene') {
    if (E.sure) add('kiem_tra', `Chắc chắn đạt kiểm tra` + (E.passRep ? `, +${E.passRep} danh tiếng` : ''), 'kiem_tra_attp')
    else {
      add('kiem_tra', `Bếp không có lỗi sơ chế, lấy nhầm, món hỏng: +${E.passRep || 0} danh tiếng`, 'kiem_tra_attp')
      add('kiem_tra', `Có lỗi: lần đầu chỉ nhắc nhở, tái phạm trong ${E.warnDays || 14} ngày bị phạt tối đa ${formatVND(E.fine || 0)}`, 'kiem_tra_attp')
    }
  }
  // M4: lượt Giỏ chợ (nguyên liệu hiếm)
  if (Number(e.rareRolls) > 0 && data.RARE_CONFIG) add('gio_cho', `+${e.rareRolls} lượt Giỏ chợ cuối ca`, 'luot_gio_cho')
  if (capNote) add('ghi_chu', 'Tiền thưởng mỗi sự kiện có mức trần theo doanh thu ca: ca ít khách có thể nhận ít hơn', null)
  return out
}

// Hiệu ứng của sự kiện ngày thành các dòng chữ (màn Chuẩn bị, thẻ "Ngày mai" ở Tổng kết). Giữ nguyên đầu ra cũ.
export function dayEffectLines(effects, data, state = null) {
  return dayEffectItems(effects, data, state).map(x => x.text)
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

// Tư thế Dì Sáu ở cảnh sảnh (chỉ các tư thế có sẵn DI_SAU_POSES): lần mở đầu tiên vỗ tay đón; sự kiện xấu lau mồ hôi;
// sự kiện có lợi giơ ngón cái; còn lại vỗ tay. Thuần.
export function prepPose(state, dayEv) {
  if (state && isFirstVisit(state)) return 'vo_tay'
  const k = dayEv && dayEv.kind
  if (k === 'xau') return 'lau_mo_hoi'
  if (k === 'tot') return 'ngon_cai'
  return 'vo_tay'
}

// Dấu trên huy hiệu sự kiện ngày: 'ok' (✓ xanh: lựa chọn đã bật / được miễn phí), 'bad' ("!" đỏ: sự kiện xấu),
// 'todo' ("!" vàng: có lựa chọn phải quyết mà chưa chọn), '' (sự kiện có lợi). Thuần.
export function dayEventMark(info) {
  if (!info) return ''
  const c = info.choice
  if (c && (c.chosen || c.free)) return 'ok'
  if (info.kind === 'xau') return 'bad'
  if (info.kind === 'chon' && c) return 'todo'
  return ''
}

// Hình của một dòng ảnh hưởng (art của dayEffectItems) → chuỗi SVG ('' nếu không có).
function effectArt(id) {
  if (!id) return ''
  if (id === 'nguoi_vui') return (HEADS.cong_nhan && HEADS.cong_nhan.vui) || ''
  if (id === 'nguoi_buc') return (HEADS.kho_tinh && HEADS.kho_tinh.buc) || ''
  return SCENE_ICONS[id] || metaArt(id) || icon(id)
}

// Đầu khách trong dự báo (cố định, không ngẫu nhiên).
const CROWD = Object.freeze(['hoc_sinh', 'cong_nhan', 'van_phong', 'co_chu', 'kho_tinh', 'co_chu_nam'])

// Hình cho từng loại điều kiện của Giấc mơ tiếp theo.
function condArt(kind) {
  if (kind === 'reputation') return metaArt('danh_hieu')
  if (kind === 'avgRating') return SCENE_ICONS.hud_sao
  if (kind === 'recipes') return metaArt('so_cong_thuc')
  if (kind === 'mastery') return metaArt('sao_lon')
  if (kind === 'chain') return DI_SAU_FACES.vui
  if (kind === 'wallet') return SCENE_ICONS.hud_vi
  return metaArt('cup')
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const M = S.meta
    const D = app.data.DIALOGUE
    const el = h('section', { class: 'prep-screen ps-lobby', testid: 'screen-prep' })
    root.appendChild(el)
    let destroyed = false
    let lastDayKey = ''
    const talk = prepTalk(app.state, D, dayEventInfo(app.state, app.state.day, app.ctx))
    let shownTip = null        // Mẹo nghề hiện ở màn (chọn ngẫu nhiên 1 lần mỗi lần vào màn)
    let pendingFx = null       // hiệu ứng chờ chạy sau lần vẽ lại kế tiếp: { reward, rect } (nhận thưởng chuỗi, mượn tiền)
    let pendingPop = ''        // bộ chọn hình cần "bật" sau lần vẽ lại kế tiếp (chọn lựa chọn, dùng phiếu)
    let bounced = false        // nút Mở hàng đã nảy lần vào màn này
    let bounceTimer = 0
    let giftTimer = 0          // nút nhận nảy sau khi cuộn tới (bấm hộp quà)

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
      const first = isFirstVisit(state)
      el.classList.toggle('is-first', first)
      const dayEv = dayEventInfo(state, state.day, app.ctx)
      const forecast = forecastCustomers(state, app.ctx, dayEv)

      // 1. Thanh gỗ dính đầu màn: tên xe, Muỗng Vàng, nút "?" (tour tự cuộn xuống tới Mở hàng vẫn thấy "?")
      el.appendChild(h('div', { class: 'prep-toprow ps-hud' },
        h('div', { class: 'prep-shop ps-shop', title: state.shopName },
          svgBox(SCENE_ICONS.tab_quay, 'ps-shop-ico'), h('span', { class: 'ps-shop-name' }, state.shopName)),
        h('div', { class: 'prep-topend' }, spoonPill(state.goldSpoons || 0, 'prep-spoons', true), helpButton(app))))

      // Chuỗi nhiệm vụ (không gồm chuỗi sự kiện: nằm trong thẻ sự kiện) và sự kiện có thời hạn
      const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.eventId && (!c.done || c.claimable.length))
      chains.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0))
      const events = eventsOverview(state, nowInfo, app.ctx)
      // quà chờ nhận NGAY ở sảnh (bước chuỗi xong chưa nhận, quà sự kiện): hộp quà trên bong bóng Dì Sáu, thấy không cần
      // cuộn ở mọi khung (thẻ chứa nút nhận nằm dưới cảnh); lối vào khác đã có chấm đỏ riêng
      const giftN = chains.reduce((s, c) => s + ((c.claimable && c.claimable.length) || 0), 0) +
        events.reduce((s, ev) => s + (Number(ev.pending) || 0), 0)

      // 2. Cảnh phố: biển ngày, xe đẩy = lối vào, Dì Sáu
      el.appendChild(sceneView(state, nowInfo, dayEv, first, giftN))

      // 3. Các tấm
      const body = h('div', { class: 'ps-body' })
      el.appendChild(body)
      const add = x => { if (x) body.appendChild(x) }

      // dải nhắc hệ thống: giờ máy bị lùi, có bản mới, đã lâu chưa sao lưu
      const rw = rewindNote(app, nowInfo, { icon: metaArt('o_lich') })
      if (rw) { rw.classList.add('ps-strip'); add(rw) }
      // M3: có bản mới của game → nút Tải lại (chỉ ở màn Chuẩn bị/Tổng kết, không bao giờ giữa ca)
      if (typeof app.updateSlot === 'function') add(app.updateSlot())
      // M3: đã 7 ngày thật chưa sao lưu → thẻ nhắc, bấm để mở Cài đặt ở mục Sao lưu
      if (backupDue(state, app.now())) {
        add(h('button', { class: 'backup-reminder ps-strip', type: 'button', testid: 'backup-reminder', onclick: () => go('settings', { focus: 'backup' }) },
          svgBox(metaArt('ruong_dong') || icon('ruong'), 'backup-reminder-icon ps-strip-ico'),
          h('span', { class: 'backup-reminder-text' },
            h('b', null, 'Đã lâu chưa sao lưu'),
            h('small', null, 'Chép mã sao lưu để giữ tiến trình khi đổi máy hoặc trình duyệt dọn dữ liệu.')),
          h('span', { class: 'backup-reminder-go', 'aria-hidden': 'true' }, '›')))
      }

      // Thẻ chuỗi: sổ giấy ghim, nhận thưởng thì xu bay về ví
      const chainEls = chains.map((c, i) => chainCard(app, c, {
        testid: i === 0 ? 'chain-card' : 'chain-card-' + c.id, compact: true, variant: 'note',
        onClaimed: (reward, rect) => { pendingFx = { reward, rect } },
        onChange: render
      }))
      // Lần mở đầu tiên: "Dì Sáu dặn: Phục vụ khách đầu tiên" lên ngay dưới cảnh
      if (first) for (const c of chainEls) add(c)

      // Sự kiện có thời hạn
      for (const ev of events) add(eventCard(ev))

      // Sự kiện ngày + Phiếu Chợ Sớm
      if (dayEv) add(dayEventCard(dayEv))
      const coupons = (state.items && state.items.phieu_cho_som) || 0
      if (coupons > 0) add(couponCard(coupons))
      // M4: gánh hàng quê theo giờ thật (không hiện ở lần mở đầu tiên)
      const rareOv = rareOverview(state, nowInfo, app.ctx)
      const rareOn = rareOv.active && !first && (state.day >= rareOv.fromDay || rareOv.total > 0 || rareOv.fragments.some(f => f.n > 0 || f.owned))
      if (rareOn) add(stallCard(nowInfo))

      if (!first) for (const c of chainEls) add(c)

      // Nợ và mượn Dì Sáu (lời mời mượn tiền cần thấy trước khi Mở hàng: đặt trước bảng "Hôm nay")
      add(loanCard(state))

      // Hôm nay: dự báo khách + ghi chú tình huống ca trước + thực đơn
      add(todayCard(state, dayEv, forecast))
      // M4: kho hàng hiếm (tồn kho, mảnh công thức, Giỏ chợ)
      if (rareOn) add(rareStockCard(rareOv))

      // Lên chặng / Giấc mơ tiếp theo (mở dần sau ca đầu)
      if (!first) add(stageCard(state))

      // Mẹo nghề đã mở (ngẫu nhiên, chọn 1 lần mỗi lần vào màn) + lối vào Sổ tay nghề
      const tip = shownTip && (state.tipsSeen || []).includes(shownTip.id) ? shownTip : (shownTip = randomSeenTip(state, app.ctx, Math.random))
      if (tip) {
        add(h('section', { class: 'card tip-card ps-tip', testid: 'prep-tip' },
          svgBox(metaArt('so_tay_nghe'), 'ps-tip-ico'),
          h('div', { class: 'ps-tip-text' },
            h('h2', { class: 'card-title' }, 'Mẹo nghề: ' + tip.title),
            h('p', null, tip.text),
            h('button', { class: 'btn btn-ghost btn-small tip-more', type: 'button', testid: 'prep-tip-notebook', onclick: () => go('notebook') }, 'Mở Sổ tay nghề ›'))))
      }

      // 4. Nút "Mở hàng": biển treo đỏ dính đáy
      el.appendChild(h('div', { class: 'sticky-foot ps-foot' },
        h('button', {
          class: 'btn btn-primary btn-big ps-open', type: 'button', testid: 'open-shift',
          onclick: () => {
            const sh = startShift(app.state, app.ctx)
            // phiên bản game lúc mở ca: bản mới kích hoạt giữa ca (đóng hết tab rồi mở lại) thì main.js biết để báo
            if (sh) sh.appVersion = app.version
            app.sound('bell')
            app.saveNow()
            app.go('service')
          }
        },
        h('span', { class: 'ps-open-hook ps-open-hook-l', 'aria-hidden': 'true' }),
        h('span', { class: 'ps-open-hook ps-open-hook-r', 'aria-hidden': 'true' }),
        h('span', { class: 'ps-open-face' },
          svgBox(SCENE_ICONS.tab_quay, 'ps-open-ico'),
          h('span', { class: 'ps-open-text' },
            h('b', null, S.buttons.openShift),
            h('small', null, `06:00 – 10:00 · khoảng ${forecast} khách`))))))

      runPendingFx()
    }

    // Hiệu ứng chờ (theo sự kiện bấm): chạy trên phần tử MỚI sau khi màn đã vẽ lại.
    function runPendingFx() {
      const fx = pendingFx
      const pop = pendingPop
      pendingFx = null
      pendingPop = ''
      if (fx && fx.reward) {
        try { celebrateReward(app, fx.rect, fx.reward) } catch (err) { console.error(err) }
      }
      if (pop && app.vfx) {
        const target = el.querySelector(pop)
        if (target) { try { app.vfx.pop(target) } catch { /* bỏ qua */ } }
      }
    }

    // Nút Mở hàng nảy nhẹ MỘT lần khi vào màn (sau khi bảng điểm danh tự mở — nếu có — đã đóng). Chỉ hình xe và chữ
    // trong nút nảy (khung nút đứng yên, vùng chạm không đổi) + một nhịp sáng; giảm chuyển động: chỉ nhịp sáng mờ.
    function bounceOpen() {
      if (bounced || destroyed) return
      bounced = true
      clearTimeout(bounceTimer)
      bounceTimer = setTimeout(() => {
        if (destroyed || !app.vfx) return
        const btn = el.querySelector('[data-testid="open-shift"]')
        const face = btn && btn.querySelector('.ps-open-face')
        try {
          if (face) app.vfx.squash(face)
          if (btn) app.vfx.glow(btn)
        } catch { /* bỏ qua */ }
      }, 260)
    }

    // ---------- Cảnh phố: mái bạt, biển ngày, xe đẩy = lối vào, Dì Sáu ----------
    function sceneView(state, nowInfo, dayEv, first, giftN = 0) {
      const o = cartOptions(state, app.data)
      const rain = !!(dayEv && dayEv.id === 'troi_mua')
      const c = dayEv && dayEv.choice
      const tarp = !!(c && c.id === 'cang_bat' && (c.chosen || c.free))
      const scene = h('div', {
        class: 'ps-scene', dataset: { wx: dayEv ? dayEv.id : 'nang', kind: dayEv ? (dayEv.kind || 'tot') : '' },
        style: { '--ps-du': o.umbrellaColor, '--ps-du-alt': o.umbrellaAlt }
      })
      scene.appendChild(h('div', { class: 'ps-sky', 'aria-hidden': 'true' },
        h('span', { class: 'ps-house ps-house-a' }), h('span', { class: 'ps-house ps-house-b' }), h('span', { class: 'ps-house ps-house-c' }),
        rain ? h('span', { class: 'ps-rain' }) : h('span', { class: 'ps-sun' })))
      scene.appendChild(h('div', { class: 'ps-awning', 'aria-hidden': 'true' }))
      if (tarp) scene.appendChild(h('div', { class: 'ps-tarp', 'aria-hidden': 'true' }))

      // 2a. Biển ngày treo dưới mái: Ngày N, chặng, ba con số; huy hiệu sự kiện ngày ở góc
      const avg = averageRating(state.ratings)
      const nRatings = (state.ratings || []).length
      const ratingNote = nRatings < 5 ? 'tạm tính' : '30 lượt gần nhất'
      const ratingTitle = nRatings < 5 ? 'Tính tạm, cần đủ 5 lượt đánh giá' : 'Trung bình 30 lượt đánh giá gần nhất'
      scene.appendChild(h('header', { class: ['prep-head', 'ps-sign', dayEv ? 'has-wx' : ''] },
        h('span', { class: 'ps-rope ps-rope-l', 'aria-hidden': 'true' }),
        h('span', { class: 'ps-rope ps-rope-r', 'aria-hidden': 'true' }),
        h('div', { class: 'ps-sign-face' },
          h('div', { class: 'prep-dayrow ps-dayrow' },
            h('h1', { class: 'prep-day', testid: 'prep-day' }, `Ngày ${state.day}`),
            h('div', { class: 'prep-sub' }, h('span', null, S.screens.prep), h('span', null, S.chang[state.chang || 1]))),
          h('div', { class: 'prep-stats ps-stats', testid: 'prep-stats' },
            // từ 1 triệu ghi gọn "1,16tr" (không ngắt dòng giữa con số), số đầy đủ ở title/aria-label
            stat(S.labels.wallet, SCENE_ICONS.hud_vi, formatMoneyShort(state.wallet), 'prep-wallet',
              { title: formatVND(state.wallet), aria: `${S.labels.wallet} ${formatVND(state.wallet)}`, amount: state.wallet }),
            stat(S.labels.reputation, metaArt('danh_hieu'), String(state.reputation || 0), null,
              { title: `${S.labels.reputation} ${state.reputation || 0}` }),
            // sao trung bình của 30 đánh giá gần nhất; dưới 5 lượt là số tạm (đệm 4 sao) — nhãn dán "tạm tính"
            stat(S.labels.rating, SCENE_ICONS.hud_sao, formatStars(avg), 'prep-rating', {
              title: ratingTitle, aria: `${S.labels.rating} ${formatStars(avg)} (${ratingNote})`, note: ratingNote, noteShown: nRatings < 5
            }))),
        dayEv ? wxBadge(dayEv) : null))

      // 2b. Xe đẩy với 7 đồ vật lối vào
      scene.appendChild(navGrid(state, nowInfo))

      // 2c. Dì Sáu trên vỉa hè + bong bóng lời dặn (lời chọn một lần khi vào màn); có quà chờ nhận ở sảnh thì dán hộp quà
      // lên góc bong bóng
      scene.appendChild(h('div', { class: ['npc-talk', 'ps-talk', giftN > 0 ? 'has-gift' : ''], testid: 'prep-talk' },
        svgBox(DI_SAU_POSES[prepPose(state, dayEv)] || DI_SAU_FACES.vui, 'ps-disau'),
        h('div', { class: 'bubble npc-bubble ps-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, talk),
          giftN > 0 ? giftBadge(giftN) : null)))
      return scene
    }

    // Hộp quà "có thưởng chờ nhận ở sảnh" (bấm → cuộn tới thẻ đầu tiên có nút nhận, nút đó nảy một lần). Tĩnh, không nhấp nháy.
    function giftBadge(n) {
      return h('button', {
        class: 'ps-gift', type: 'button', testid: 'prep-gift', dataset: { n: String(n) },
        'aria-label': `Có ${n} phần thưởng chờ nhận ở sảnh. Xem`, title: 'Thưởng chờ nhận',
        onclick: () => {
          app.sound('click')
          const card = el.querySelector('.ps-body > .event-card.has-pending, .ps-body > .chain-card.has-claim')
          if (!card) return
          const reduced = isReduced(app)
          card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
          const btn = card.querySelector('.chain-claim-row .btn:not([disabled]), [data-testid="open-event"]')
          clearTimeout(giftTimer)
          if (!btn || !app.vfx) return
          giftTimer = setTimeout(() => {
            if (destroyed || !btn.isConnected) return
            try { if (reduced) app.vfx.glow(btn); else app.vfx.squash(btn) } catch { /* bỏ qua */ }
          }, reduced ? 0 : 450)
        }
      },
      svgBox(metaArt('qua') || icon('qua'), 'ps-gift-ico'),
      redDot(n, 'prep-gift-dot'))
    }

    function stat(label, ico, value, testid, { title = null, aria = null, amount = null, note = null, noteShown = false } = {}) {
      return h('div', { class: 'stat ps-stat', title: title || label },
        svgBox(ico || '', 'ps-stat-ico'),
        h('span', { class: 'stat-label ps-sr' }, label),
        h('b', { class: 'stat-value', testid, dataset: amount !== null ? { amount } : undefined, 'aria-label': aria }, value),
        note ? h('small', { class: ['stat-note', noteShown ? '' : 'ps-sr'] }, note) : null)
    }

    // Huy hiệu sự kiện ngày trên biển (bấm → cuộn tới tờ thông báo sự kiện).
    function wxBadge(info) {
      const mark = dayEventMark(info)
      return h('button', {
        class: ['ps-wx', mark ? 'mark-' + mark : ''], type: 'button', testid: 'prep-wx', dataset: { mark: mark || 'none' },
        'aria-label': `${M.dayEvent}: ${info.name}. Xem chi tiết`, title: info.name,
        onclick: () => {
          app.sound('click')
          const card = el.querySelector('[data-testid="day-event-card"]')
          if (card) card.scrollIntoView({ block: 'center', behavior: isReduced(app) ? 'auto' : 'smooth' })
        }
      },
      svgBox(evArt(info), 'ps-wx-ico'),
      mark ? h('span', { class: 'ps-wx-mark', 'aria-hidden': 'true' }, mark === 'ok' ? '✓' : '!') : null,
      h('span', { class: 'ps-sr' }, info.name))
    }

    function evArt(info) {
      const id = info.icon || info.id
      return metaArt(id) || icon(id)
    }

    // ---------- Lối vào (đồ vật trên xe đẩy, có chấm đỏ) ----------
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
      // status: chữ cho trình đọc màn hình (ô ghi tên ngắn, chấm đỏ báo việc cần làm)
      const tile = (testid, art, label, status, dot, onclick) => h('button', {
        class: ['nav-tile', 'icon-tile', 'ps-obj', dot ? 'has-dot' : ''], type: 'button', testid, onclick,
        dataset: { dot: dot ? String(dot) : '0' }, 'aria-label': `${label}: ${status}`, title: status
      },
      h('span', { class: 'ps-obj-art' }, svgBox(metaArt(art), 'nav-icon'), dot ? redDot(dot, testid + '-dot') : null),
      h('span', { class: 'nav-label ps-tag' }, label))
      return h('nav', { class: 'nav-grid icon-grid ps-nav', 'aria-label': 'Lối vào', testid: 'prep-nav' },
        h('div', { class: 'ps-row ps-row-top' },
          tile('open-shop', 'cho_cong_thuc', M.shop, buyable ? `${buyable} món mua được` : 'Món mới, nâng cấp, màu dù', buyable ? 1 : 0, () => go('shop')),
          tile('open-quests', 'viec_hom_nay', M.quests, `${qDone}/${ql.quests.length} việc xong`, qClaim, () => go('quests')),
          tile('open-checkin', 'diem_danh', M.checkin, ck.canClaim ? 'Có quà' : ck.reason === 'lui_gio' ? 'Tạm khóa' : 'Mai ghé tiếp', ck.canClaim ? 1 : 0,
            () => openCheckin(app, { onClaim: () => setTimeout(render, 0) }).then(() => render())),
          tile('open-mail', 'hop_thu', M.mailbox, mails ? `${mails} thư mới` : 'Không có thư mới', mails, () => go('mailbox'))),
        h('div', { class: 'ps-cart', 'aria-hidden': 'true' },
          h('span', { class: 'ps-cart-top' }), h('span', { class: 'ps-cart-front' }),
          h('span', { class: 'ps-wheel ps-wheel-l' }), h('span', { class: 'ps-wheel ps-wheel-r' })),
        h('div', { class: 'ps-row ps-row-low' },
          tile('open-recipe-book', 'so_cong_thuc', S.screens.recipeBook, 'Món, thạo món, Sổ từ vùng miền', 0, () => go('recipe-book')),
          tile('open-notebook', 'so_tay_nghe', S.screens.notebook, nb ? `${nb} nhóm chờ nhận thưởng` : 'Thẻ Mẹo nghề đã mở', nb, () => go('notebook')),
          tile('open-settings', 'cai_dat', S.screens.settings, backup ? 'Đã lâu chưa sao lưu' : 'Âm thanh, hỗ trợ, sao lưu', backup, () => go('settings'))))
    }

    function go(name, params) {
      app.sound('click')
      app.go(name, params)
    }

    // ---------- Thẻ sự kiện có thời hạn: thiệp lễ ----------
    // pending: điểm danh sự kiện, việc sự kiện xong chưa nhận, bước chuỗi sự kiện chờ nhận (cả trong ân hạn) → chấm đỏ
    function eventCard(ev) {
      const owned = ev.recipes.filter(r => r.owned).length
      const recipeNote = owned ? ' · Đã nhận món lễ' : ev.phase === 'dang_dien_ra' ? ' · Món lễ đang chờ bạn' : ''
      const def = app.data.EVENTS && app.data.EVENTS[ev.id]
      const cur = (def && def.currencyId && metaArt(def.currencyId)) || metaArt('phan_trang')
      const phase = ev.phase === 'sap_dien_ra' ? M.eventSoon : ev.phase === 'dang_dien_ra' ? M.eventActive : 'Ân hạn'
      const line = (ico, text, extra = {}) => h('p', { class: ['small', 'ps-ev-line', extra.cls || ''], testid: extra.testid || null },
        svgBox(ico || '', 'ps-ev-ico'), h('span', null, text))
      return h('section', { class: ['event-card', 'ps-fest', 'phase-' + ev.phase, ev.pending ? 'has-pending' : ''], testid: 'event-card', dataset: { eventId: ev.id, phase: ev.phase, dot: String(ev.pending || 0) } },
        h('div', { class: 'event-card-head' },
          svgBox(metaArt(ev.id) || icon('phan_trang'), 'event-card-icon'),
          h('div', { class: 'ps-fest-title' },
            h('span', { class: ['event-phase', 'ps-phase-' + ev.phase] }, phase),
            h('b', { class: 'event-name' }, ev.name))),
        line(SCENE_ICONS.hud_gio, ev.phase === 'sap_dien_ra' ? `Mở sau ${durationText(ev.msToStart)}` : ev.phase === 'dang_dien_ra' ? `Còn ${durationText(ev.msToEnd)}` : phaseText(app, ev, app.nowInfo())),
        ev.phase !== 'sap_dien_ra' ? line(cur, `${ev.tem} ${ev.currencyName}` + recipeNote) : h('p', { class: 'small ps-ev-desc' }, ev.desc),
        ev.pending ? line(metaArt('qua'), ev.phase === 'an_han' ? 'Có thưởng chuỗi chờ nhận trước khi hết ân hạn' : 'Có quà sự kiện chờ nhận', { cls: 'event-pending', testid: 'event-pending' }) : null,
        h('button', { class: ['btn', ev.pending ? 'btn-primary' : 'btn-secondary', 'btn-small'], type: 'button', testid: 'open-event', onclick: () => go('event', { eventId: ev.id }) },
          ev.pending ? 'Nhận quà sự kiện' : 'Xem sự kiện'),
        ev.pending ? redDot(ev.pending, 'event-card-dot') : null)
    }

    // ---------- Sự kiện ngày: tờ thông báo ghim ----------
    function dayEventCard(info) {
      // hiệu ứng thật: đã chọn Căng bạt / có Bạt che mưa thì ghi hiệu ứng của lựa chọn (khớp thẻ Dự báo)
      const items = dayEffectItems(dayEventEffects(info, app.ctx), app.data, app.state)
      const c = info.choice
      const kind = info.kind || 'tot'
      let choiceEl = null
      if (c) {
        choiceEl = h('div', { class: ['day-choice', 'ps-choice', c.chosen ? 'is-on' : ''] },
          svgBox(c.id === 'cang_bat' ? (metaArt('bat_che_mua') || evArt(info)) : evArt(info), 'ps-choice-ico'),
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
              pendingPop = '.ps-choice .ps-choice-ico'
              render()
            }
          }, c.free ? 'Tự căng' : c.chosen ? 'Bỏ chọn' : 'Chọn'))
      }
      const warn = dayEventWarnLine(app.state, info, app.data)
      // M4: nhãn loại sự kiện (có lợi / có lựa chọn / cần phòng) để người chơi biết trước
      const kindLabel = { tot: 'Có lợi', chon: 'Có lựa chọn', xau: 'Cần phòng trước' }[kind] || ''
      return h('section', { class: ['card', 'day-event-card', 'ps-notice', 'kind-' + kind], testid: 'day-event-card', dataset: { event: info.id, kind } },
        h('span', { class: 'g-pin', 'aria-hidden': 'true' }),
        h('div', { class: 'day-ev-head' }, svgBox(evArt(info), 'day-ev-icon'),
          h('div', { class: 'ps-notice-title' },
            h('small', { class: 'ps-kicker' }, M.dayEvent),
            h('b', { class: 'day-ev-name' }, info.name),
            kindLabel ? h('span', { class: ['ps-kind', 'ps-kind-' + kind] }, kindLabel) : null)),
        h('p', { class: 'small' }, info.desc),
        items.length ? h('ul', { class: 'day-ev-effects' }, items.map(x => {
          const art = effectArt(x.art)
          return h('li', { class: art ? 'has-ico' : 'no-ico', dataset: { kind: x.kind } },
            art ? svgBox(art, 'ps-fx-ico') : null, h('span', { class: 'ps-fx-text' }, x.text))
        })) : null,
        warn ? h('p', { class: 'small day-ev-warn', testid: 'day-event-warn' }, warn) : null,
        choiceEl)
    }

    // ---------- M4: gánh hàng quê ----------
    function stallCard(nowInfo) {
      const RS = S.rare || {}
      const st = stallStatus(app.state, nowInfo, app.ctx)
      const find = id => st.stalls.find(x => x.id === id) || null
      // tiêu đề nói rõ trạng thái (không lặp tên thẻ; phiên chưa mở thì không ghi tên phiên như đang mở)
      let key = 'closed', stall = null, sub = '', btn = null, title = ''
      const go = id => h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: 'open-market',
        onclick: () => { app.sound('click'); app.go('market', { stallId: id }) } },
      svgBox(metaArt('ganh_hang'), 'ps-btn-ico'), h('span', null, id === st.pending ? 'Lựa tiếp' : 'Ghé gánh hàng'))
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
      const stateText = { open: 'Đang mở', pending: 'Lựa dở', done: 'Đã ghé', closed: 'Chưa mở', early: 'Chưa mở', locked: 'Tạm khóa' }[key]
      const INGS = app.data.INGREDIENTS || {}
      const goods = stall ? (stall.goods || []).filter(g => INGS[g]) : []
      const seller = stall && stall.persona ? bust(stall.persona, 'vui', { gender: stall.gender, who: stall.id }) : ''
      return h('section', { class: ['card', 'stall-card', 'ps-stall', 'st-' + key], testid: 'stall-card', dataset: { state: key, stall: stall ? stall.id : '' } },
        h('div', { class: 'day-ev-head ps-stall-head' },
          seller ? svgBox(seller, 'ps-seller') : svgBox(metaArt('ganh_hang'), 'day-ev-icon ps-seller-ico'),
          h('div', { class: 'ps-stall-title' },
            h('div', { class: 'ps-kick-row' },
              h('small', { class: 'ps-kicker' }, S.screens.market || 'Gánh hàng quê'),
              stateText && stateText !== title ? h('span', { class: ['ps-state', 'ps-state-' + key] }, stateText) : null),
            h('b', { class: 'day-ev-name', testid: 'stall-title' }, title || (S.screens.market || 'Gánh hàng quê')),
            h('p', { class: 'small' }, sub))),
        goods.length ? h('ul', { class: 'ps-goods', 'aria-hidden': 'true' }, goods.map(g => h('li', { class: 'ps-good' },
          svgBox(icon(INGS[g].icon || g), 'ps-good-ico'), h('span', null, INGS[g].name), h('b', { class: 'rare-star' }, starText(INGS[g].star))))) : null,
        goods.length ? h('p', { class: 'small stall-goods ps-sr' }, (key === 'closed' ? 'Phiên kế tiếp có: ' : 'Hàng hiếm: ') +
          goods.map(g => `${INGS[g].name} ${starText(INGS[g].star)}`).join(', ')) : null,
        h('ul', { class: 'stall-times small' }, st.stalls.map(x => h('li', { class: [x.open ? 'is-open' : '', x.done ? 'is-done' : ''], dataset: { stall: x.id } },
          `${x.name} ${x.from}–${x.to}` + (x.done ? ' · đã ghé' : x.open ? ' · đang mở' : '')))),
        btn)
    }

    // ---------- M4: kho hàng hiếm ----------
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
      const piece = metaArt('manh_cong_thuc')
      const pieceOff = metaArt('manh_cong_thuc', { silhouette: true }) || piece
      const ingPct = Math.round((Number(b.ingredient) || 0) * 100)
      const fragPct = Math.round((Number(b.fragment) || 0) * 100)
      return h('section', { class: 'card rare-stock-card ps-store', testid: 'rare-stock-card' },
        h('h2', { class: 'card-title ps-plaque ps-plaque-wood' }, svgBox(metaArt('kho_hiem'), 'ps-plaque-ico'), h('span', null, RS.stockTitle || 'Kho hàng hiếm')),
        h('p', { class: 'small muted' }, (RS.dayCap || '').replace('{got}', String(ov.today.got)).replace('{cap}', String(ov.today.cap))
          .replace('{frags}', String(ov.today.frags)).replace('{fragCap}', String(ov.today.fragCap))),
        h('ul', { class: 'rare-stock ps-shelf' }, ov.stock.map(x => h('li', { class: ['rare-stock-item', x.n > 0 ? 'has' : 'empty'], testid: 'rare-stock-' + x.id,
          dataset: { n: String(x.n) }, title: `${x.name} (${x.origin})` },
        svgBox(icon(x.icon), 'rare-stock-icon'),
        h('span', { class: 'rare-stock-name' }, x.name),
        h('b', { class: 'rare-stock-n' }, `Kho ${x.n}/${x.max}`)))),
        ov.total === 0 ? h('p', { class: 'small muted' }, RS.stockEmpty || '') : null,
        h('h3', { class: 'rare-h3' }, svgBox(piece, 'ps-h3-ico'), h('span', null, 'Công thức hiếm')),
        h('ul', { class: 'rare-frags' }, ov.fragments.map(f => {
          const status = f.owned ? 'owned' : f.ready ? 'ready' : f.baseOwned ? 'collecting' : 'locked'
          const text = f.owned ? `Đã mở · kho đủ cho ${f.portions} phần`
            : f.ready ? (RS.readyToTaste || '')
              : [(RS.fragments || 'Mảnh {n}/{need}').replace('{n}', String(f.n)).replace('{need}', String(f.need)),
                f.needBase.length ? (RS.needBase || 'Cần {base}').replace('{base}', f.needBase.join(', ')) : ''].filter(Boolean).join(' · ')
          const need = Math.max(1, Math.min(6, Number(f.need) || 3))
          const have = f.owned ? need : Math.max(0, Math.min(need, Number(f.n) || 0))
          return h('li', { class: ['rare-frag', 'st-' + status], testid: 'rare-fragments-' + f.recipeId, dataset: { n: String(f.n), status } },
            h('span', { class: 'ps-frag-art' }, svgBox(icon(f.icon), 'rare-frag-icon'), h('span', { class: 'ps-frag-star', 'aria-hidden': 'true' }, '★')),
            h('div', { class: 'rare-frag-text' },
              h('b', null, f.name, ' ', h('span', { class: 'rare-star' }, '★')),
              h('span', { class: 'ps-pieces', 'aria-hidden': 'true' },
                Array.from({ length: need }, (_, i) => svgBox(i < have ? piece : pieceOff, ['ps-piece', i < have ? 'on' : 'off'].join(' ')))),
              h('small', null, text),
              h('small', { class: 'muted' }, 'Mỗi phần: ' + f.rare.map(x => `${x.n} ${x.name}`).join(', '))),
            f.ready ? h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: 'rare-taste-' + f.recipeId,
              onclick: () => { app.sound('click'); app.go('tasting', { recipeId: f.recipeId, back: 'prep' }) } }, 'Nấu thử') : null)
        })),
        h('div', { class: 'basket-luck ps-basket', testid: 'basket-luck', dataset: { pity: String(b.pity), sure: String(!!b.sure), fragSure: String(!!b.fragSure), all: b.allReason || '' } },
          h('div', { class: 'basket-head' }, svgBox(metaArt('luot_gio_cho') || icon('ro'), 'rare-frag-icon'), h('b', null, RS.basketTitle || 'Giỏ chợ')),
          h('p', { class: 'small' }, b.allIng ? allText
            : (RS.basketOdds || '').replace('{ing}', pct(b.ingredient)).replace('{frag}', pct(b.fragment))),
          b.allIng ? null : h('div', { class: 'ps-odds', 'aria-hidden': 'true' },
            ingPct > 0 ? h('span', { class: 'ps-odds-ing', style: { flexGrow: String(ingPct) } }, ingPct + '%') : null,
            fragPct > 0 ? h('span', { class: 'ps-odds-frag', style: { flexGrow: String(fragPct) } }, fragPct + '%') : null),
          b.allIng ? null : progressBar(b.pity, b.pityAfter, { label: 'May mắn Giỏ chợ', kind: 'luck' }),
          b.allIng ? null : h('p', { class: 'small muted' }, luck),
          h('p', { class: 'small muted' }, RS.basketHow || '')),
        h('p', { class: 'small muted' }, (RS.stockNote || '').replace('{max}', String(ov.stockMax)).replace('{gold}', String(ov.overflowGold))))
    }

    // ---------- Phiếu Chợ Sớm: vé giấy ----------
    function couponCard(n) {
      const on = !!(app.state.prep && app.state.prep.day === app.state.day && app.state.prep.coupon)
      return h('section', { class: ['card', 'coupon-card', 'ps-ticket', on ? 'is-on' : ''], testid: 'coupon-card' },
        svgBox(metaArt('phieu_cho_som') || icon('phieu_cho_som'), 'day-ev-icon ps-ticket-ico'),
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
            pendingPop = '.ps-ticket .ps-ticket-ico'
            render()
          }
        }, on ? 'Bỏ dùng' : 'Dùng'))
    }

    // ---------- Nợ / mượn Dì Sáu ----------
    function loanCard(state) {
      if (state.loan) {
        return h('div', { class: 'card card-warn ps-loan', testid: 'loan-info' },
          h('div', { class: 'npc-talk compact' }, svgBox(DI_SAU_FACES.lo, 'npc-face small'),
            h('p', null, h('b', null, `${S.labels.loan}: còn ${formatVND(state.loan.remaining)}.`), ' Ca nào có lãi sẽ trả dần.')))
      }
      if (!offerLoan(state, app.data.BALANCE)) return null
      return h('div', { class: 'card card-warn ps-loan' },
        h('div', { class: 'npc-talk compact' }, svgBox(DI_SAU_FACES.lo, 'npc-face small'), h('p', null, D.diSau.loanOffer)),
        h('button', {
          class: 'btn btn-secondary', type: 'button', testid: 'take-loan',
          onclick: ev => {
            let rect = null
            try { rect = ev.currentTarget.getBoundingClientRect() } catch { /* bỏ qua */ }
            if (takeLoan(app.state, app.data.BALANCE)) {
              app.sound('coin')
              app.toast(`Dì Sáu cho mượn ${formatVND(app.state.loan.amount)}.`, { kind: 'good' })
              app.saveNow()
              pendingFx = rect ? { reward: { money: app.state.loan.amount }, rect } : null
              render()
            }
          }
        }, svgBox(metaArt('xu'), 'ps-btn-ico'), h('span', null, 'Dì Sáu cho mượn')))
    }

    // ---------- Bảng gỗ "Hôm nay": dự báo khách, ghi chú ca trước, thực đơn ----------
    function todayCard(state, dayEv, forecast) {
      const fc = forecastDetail(state, app.ctx, dayEv)
      const debts = pendingDebts(state)
      const menu = orderableRecipes(state, app.ctx)
      const levels = app.data.BALANCE.masteryLevels
      const nLv = Math.max(1, levels.length)
      const line = (cls, ico, text, extra = {}) => h('p', { class: ['small', 'ps-line', cls], testid: extra.testid || null, dataset: extra.dataset },
        svgBox(ico || '', 'ps-line-ico'), h('span', null, text))
      const bonusArt = fc.added > 0 ? icon('mon_tra_tac') : metaArt('danh_hieu')
      return h('section', { class: 'card prep-today ps-board' },
        h('h2', { class: 'card-title ps-plaque' }, 'Hôm nay'),
        h('div', { class: 'ps-forecast' },
          h('span', { class: 'ps-crowd', 'aria-hidden': 'true' },
            CROWD.slice(0, Math.max(1, Math.min(6, forecast))).map(p => svgBox((HEADS[p] && HEADS[p].vui) || '', 'ps-crowd-face'))),
          h('b', { class: 'ps-big', 'aria-hidden': 'true' }, String(forecast)),
          h('p', { class: 'prep-forecast', testid: 'prep-forecast' }, `Khoảng ${forecast} khách ghé xe trong ca sáng nay (06:00 – 10:00).`)),
        state.day >= (app.data.BALANCE.qrFromDay || 4) ? line('muted', SCENE_ICONS.khau_thanh_toan, 'Có khách trả bằng chuyển khoản QR.') : null,
        fc.added > 0 ? line('prep-bonus', bonusArt, `Nhờ ly trà "mở hàng" hôm trước, ca này có thêm ${fc.added} khách.`, { testid: 'prep-incident-bonus', dataset: { kind: 'khach' } })
          : fc.rep > 0 ? line('prep-bonus', bonusArt, `Ca này đã đủ khách, nên ly trà "mở hàng" hôm trước thành +${fc.rep} danh tiếng.`, { testid: 'prep-incident-bonus', dataset: { kind: 'danh_tieng' } }) : null,
        debts.length ? line('prep-debts', metaArt('ghi_no'),
          'Sổ ghi nợ: ' + debts.map(d => `${d.name} ${formatVND(d.amount)}`).join(', ') + ' (khách quen thường trả trong 3 ca)', { testid: 'prep-debts' }) : null,
        h('div', { class: 'prep-menu' }, menu.map(id => {
          const r = app.data.RECIPES[id]
          const p = state.recipes[id]
          const lv = masteryLevel(p, levels)
          const lvOn = Math.max(0, Math.min(nLv, Number(lv) || 0))
          const evLabel = state.eventRecipes && state.eventRecipes[id] ? state.eventRecipes[id].label : ''
          // M4: món hiếm: huy hiệu ★ và số phần kho còn làm được
          const rareLeftN = r.source === 'hiem' ? rarePortions(state, r) : null
          return h('div', { class: ['prep-dish', rareLeftN !== null ? 'is-rare' : ''], testid: 'prep-dish-' + id },
            h('span', { class: 'ps-dish-art' }, svgBox(icon(r.icon || id), 'dish-icon small'),
              h('span', { class: 'ps-price', 'aria-hidden': 'true' }, formatK(r.price))),
            h('div', { class: 'prep-dish-info' },
              h('div', { class: 'prep-dish-name' }, r.name),
              h('div', { class: 'prep-dish-price ps-sr' }, formatVND(r.price)),
              h('div', { class: 'prep-dish-lv' },
                h('span', { class: 'ps-lv', 'aria-hidden': 'true' }, '●'.repeat(lvOn) + '○'.repeat(nLv - lvOn)),
                h('span', null, `${S.labels.mastery}: ${S.masteryLevels[lv] || lv}`)),
              evLabel ? h('div', { class: 'prep-dish-tag' }, evLabel) : null,
              rareLeftN !== null ? h('div', { class: 'prep-dish-tag is-rare', testid: 'rare-left-' + id }, `★ còn ${rareLeftN} phần`) : null))
        })))
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
      const cup = h('span', { class: 'ps-dream-art', 'aria-hidden': 'true' }, svgBox(metaArt('cup'), 'ps-dream-cup'))
      if (st.eligible || unlocked) {
        return h('article', { class: ['stage-card', 'ps-dream', st.eligible ? 'is-ready' : ''], ...cardLink('stage-up-card') },
          st.eligible ? h('small', { class: 'g-ribbon g-ribbon--gold ps-ribbon' }, 'Đủ điều kiện lên chặng!') : null,
          h('div', { class: 'dream-head' }, cup,
            h('div', null,
              st.eligible ? null : h('small', null, M.nextDream),
              h('b', null, st.screenTitle || M.stageUpTitle))),
          h('span', { class: 'small' }, st.eligible ? M.stageUpKeepPlaying : `Đã đạt ${st.conditions.filter(c => c.done).length}/${st.conditions.length} điều kiện`),
          h('span', { class: 'stage-card-go' }, 'Xem ›'))
      }
      const todo = st.conditions.filter(c => !c.done)
      const done = st.conditions.length - todo.length
      return h('article', { class: ['dream-card', 'ps-dream'], ...cardLink('dream-card') },
        h('div', { class: 'dream-head' }, cup,
          h('div', null, h('small', null, M.nextDream), h('b', null, st.name || S.chang[2])),
          h('span', { class: 'dream-count' }, `${done}/${st.conditions.length}`)),
        h('ul', { class: 'dream-list' }, todo.slice(0, 3).map(c => h('li', { dataset: { kind: c.kind } },
          svgBox(condArt(c.kind), 'ps-cond-ico'),
          h('div', { class: 'ps-cond-text' },
            h('span', { class: 'dream-label' }, c.label),
            c.kind === 'chain' ? null : progressBar(c.progress, null, { label: c.label }),
            c.hint ? h('small', { class: 'dream-hint' }, c.hint) : null)))),
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
      // bảng điểm danh (nếu có) đã đóng: nút Mở hàng nảy nhẹ một lần
      bounceOpen()
      // thư mới (không chặn thao tác)
      const fresh = [...new Set(got)].filter(id => !app.session.mailToastIds.includes(id))
      if (fresh.length) {
        app.session.mailToastIds.push(...fresh)
        const welcome = fresh.includes('chao_mung')
        const one = fresh.length === 1 ? ((state.mail && state.mail.list) || []).find(m => m.id === fresh[0]) : null
        const others = fresh.length - 1
        const text = welcome ? `Dì Sáu gửi thư chào mừng kèm quà${others > 0 ? ` và ${others} thư khác` : ''}, mở Hộp thư nhận nha!`
          : one ? `Thư mới: ${one.title}` : `Vừa có ${fresh.length} thư mới trong Hộp thư`
        app.toast(text, { kind: 'info', title: welcome ? '' : M.mailbox, icon: metaArt('thu') || icon('thu'), testid: 'mail-toast' })
      }
      // việc sự kiện hôm trước đã xong mà quên nhận: đã tự cộng Tem
      const autos = ((res && res.eventQuestsAuto) || []).concat(app.session.pendingEventAuto || [])
      app.session.pendingEventAuto = []
      for (const a of autos) {
        const ev = app.data.EVENTS && app.data.EVENTS[a.eventId]
        if (ev) app.toast(`Việc sự kiện ${a.dayKey.slice(8, 10)}/${a.dayKey.slice(5, 7)} đã xong mà chưa nhận: tự cộng ${a.tem} ${ev.currencyName}.`, { kind: 'good', icon: metaArt(ev.currencyId) || icon('phan_trang'), testid: 'event-auto-toast' })
      }
      // lần đầu đủ điều kiện lên chặng
      const p = state.progression
      if (p && p.stageUpReady && !p.stageUpSeen && !destroyed) {
        const v = await app.modal({
          title: M.stageUpTitle, icon: DI_SAU_FACES.tu_hao, testid: 'stage-up-modal',
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
    return { unmount() { destroyed = true; clearInterval(timer); clearTimeout(bounceTimer); clearTimeout(giftTimer) } }
  }
}
