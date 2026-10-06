// Màn Tổng kết ca — màn kết quả kiểu game (M5 Đợt 3, gói M-F, bản 0.5.2; phong cách Phòng mẫu, Bếp 0.5.0, Quầy 0.5.1).
// Bố cục từ trên xuống:
//  1. Thanh gỗ dính đầu màn (.sum-head-row: tour STICKY, nút "?"): "Tổng kết ca", huy hiệu ngày, viên Tiền quán.
//  2. Băng rôn "Hết ca!" trên bảng gỗ: 5 sao lớn bật lần lượt (sao trung bình ca, testid summary-stars), hạng ca bằng chữ,
//     Dì Sáu bán thân (tư thế theo hạng) với bong bóng nhận xét, dải "Lãi trong ca" số to đếm lên.
//  3. Tờ sổ kẻ dòng "Sổ lãi lỗ ca" (table.ledger — helpers e2e đọc): mỗi khoản có hình (doanh thu, chuyển khoản, tip, sự
//     kiện, giá vốn, chi phí cố định, phạt…), số đếm lên khi tờ sổ hiện ra, dòng lãi cuối có con dấu LÃI / LỖ.
//  4. Chốt két, khách hôm nay (hàng mặt khách bán thân theo tâm trạng + danh tiếng), tình huống và sự kiện trong ca, hàng
//     hiếm cuối ca, thạo món (hình món + thanh tiến độ, "Lên cấp!"), lỗi quầy / bếp, lời khách, Mẹo của Dì Sáu, tiến độ
//     Việc hôm nay / chuỗi / Tem, Sổ tay nghề, thẻ "Ngày mai" (sự kiện ngày báo trước + dự báo khách).
//  5. Nút "Ngày mai" dính đáy (.sticky-foot): biển treo đỏ có hình lịch.
// Hiệu ứng: chỉ chạy MỘT lần khi vào màn của một ca (khóa ca trong PLAYED; vẽ lại / mở lại cùng ca thì hiện thẳng), chỉ
// transform / opacity, qua app.vfx (lớp pointer-events: none, tự dọn, không phát lên bus). Giảm chuyển động (isReduced):
// mọi thứ hiện thẳng, số hiện ngay giá trị cuối, không xu bay, không hoạt ảnh lặp.
// Số đếm lên trong sổ lãi lỗ KHÔNG ghi đè chữ thật của ô: chữ trong DOM luôn là số cuối (e2e đọc ngay), số đang đếm vẽ
// bằng ::after (attr(data-shown)) phủ lên trong lúc đếm.
// Giữ: testid summary, summary-profit (data-amount), summary-drawer-diff ("0đ"), summary-stars, summary-reviews,
// summary-tip-rule, summary-event-money (li[data-event][data-money]), summary-incident (data-incident, data-choice),
// summary-debt, summary-rare, summary-advice, summary-tip, summary-quests, summary-chain, summary-event-chain,
// summary-event, summary-notebook, summary-day-event (data-event), summary-tomorrow, next-day; lớp .summary-screen,
// .sum-head-row, table.ledger (tr gồm 2 td, tr.total), .sticky-foot; export incidentLines (nội dung giữ nguyên).
// Import trong Node an toàn: không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE, SCENE_ICONS } from '../art/scene.js'
import { DI_SAU_POSES, DI_SAU_FACES, HEADS, bust, head } from '../art/people.js'
import { averageRating } from '../../core/scoring.js'
import { masteryLevel } from '../../core/mastery.js'
import { formatVND, formatStars, formatMoneyShort, signedVND } from '../format.js'
import { questList, questDef } from '../../core/quests.js'
import { chainStatus } from '../../core/chains.js'
import { dayEventInfo, dayEventEffects, eventsOverview } from '../../core/events.js'
import { progressBar, moneyPill, itemTile, npcFace } from '../components/meta-ui.js'
import { chainTitle } from '../components/chain-card.js'
import { dayEffectLines, dayEffectItems, forecastCustomers, dayEventWarnLine, choiceCostText } from './prep.js'
import { notebookBadge } from '../../core/notebook.js'
import { helpButton } from '../components/help.js'
import { sheetMood, emoteKey, EMOTES } from '../components/score-sheet.js'
import { isReduced } from '../motion.js'

// ---------- Nhịp hiệu ứng vào màn (ms) ----------
export const SUMMARY_FX = Object.freeze({
  starStart: 380, starGap: 170, starMs: 340,   // sao lớn bật lần lượt
  heroCount: 950, heroAt: 260,                  // số "Lãi trong ca" đếm lên
  rowCount: 820,                                // các dòng sổ lãi lỗ đếm lên (cùng lúc) khi tờ sổ hiện ra
  stampGap: 120,                                // con dấu đóng sau khi số đếm xong
  walletMs: 900                                 // viên Tiền quán đếm lên khi xu bay về
})

// Ca đã diễn hiệu ứng vào màn (khóa theo ca): vẽ lại / mở lại cùng ca thì hiện thẳng trạng thái cuối.
const PLAYED = new Set()

// Hạng thức ăn tính "món ngon" cho thạo món (khớp GOOD_GRADES của src/core/mastery.js).
const GOOD_GRADES = Object.freeze(['ngon', 'tuyet_hao'])

// ---------- Hình nhỏ vẽ tay (viewBox 64, viền mực #3a2618, ba tông, ánh sáng trên-trái; không gradient / filter / href) ----------
const INK = '#3a2618'
const svg64 = body => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`
const STAR_PTS = 'M32 5L39.6 22.6L58.6 24.3L44.2 36.9L48.5 55.5L32 45.7L15.5 55.5L19.8 36.9L5.4 24.3L24.4 22.6Z'
// sao vàng ba tông (giống sao phiếu chấm Quầy 0.5.1)
const STAR_ON = svg64(`<path d="${STAR_PTS}" fill="#ffd23f" stroke-width="3.5"/>` +
  '<path d="M32 45.7L48.5 55.5L44.2 36.9L58.6 24.3L45 26Q42 40 32 45.7Z" fill="#e9a400" stroke="none"/>' +
  '<path d="M20 26L26 25.4L29.6 17" fill="none" stroke="#fff" stroke-width="3" opacity=".65"/>')
// ổ sao khắc trên bảng gỗ (chưa đạt)
const STAR_SLOT = svg64(`<path d="${STAR_PTS}" fill="#9a5e27" stroke-width="3.5"/>` +
  '<path d="M32 9.6L25.6 24.4L10.4 25.8Q22 27 32 9.6Z" fill="#6f4219" stroke="none" opacity=".55"/>')
// sao nhỏ trên giấy (lời khách, mức thạo món): đạt / chưa đạt
const PIP_OFF = svg64(`<path d="${STAR_PTS}" fill="#efe3c8" stroke="#bfa98a" stroke-width="3.5"/>`)
// mũi tên lên cấp (vàng, viền mực)
const UP_ART = svg64('<path d="M32 6L56 32H42V56H22V32H8Z" fill="#43a63d" stroke-width="3.5"/>' +
  '<path d="M42 32V56H34V32Z" fill="#226b28" stroke="none" opacity=".55"/>' +
  '<path d="M18 30L30 16" fill="none" stroke="#fff" stroke-width="3.5" opacity=".6"/>')
// dấu ✓ xanh tròn (két khớp, không có lỗi)
const OK_ART = svg64('<circle cx="32" cy="32" r="26" fill="#43a63d" stroke-width="3.5"/>' +
  '<path d="M38 55A26 26 0 0 0 58 32C58 44 50 54 38 55Z" fill="#226b28" stroke="none" opacity=".6"/>' +
  '<path d="M19 33L28 42L45 22" fill="none" stroke="#fff" stroke-width="7"/>')
// dấu ✗ đỏ tròn (két lệch)
const BAD_ART = svg64('<circle cx="32" cy="32" r="26" fill="#d8392b" stroke-width="3.5"/>' +
  '<path d="M38 55A26 26 0 0 0 58 32C58 44 50 54 38 55Z" fill="#8f2015" stroke="none" opacity=".6"/>' +
  '<path d="M22 22L42 42M42 22L22 42" fill="none" stroke="#fff" stroke-width="7"/>')

// Hình (chuỗi SVG) theo id: SCENE_ICONS → hình cảnh Quầy → hình meta → icon() của art.js.
function artOf(id) {
  if (!id) return ''
  if (Object.prototype.hasOwnProperty.call(SCENE_ICONS, id)) return SCENE_ICONS[id]
  if (Object.prototype.hasOwnProperty.call(SCENE, id)) return SCENE[id]
  return metaArt(id) || icon(id)
}

// ---------- Hàm thuần (test được trong Node) ----------

/**
 * Hạng ca (chỉ là chữ hiển thị, KHÔNG phải luật chơi): theo lãi và sao trung bình ca.
 * → { key: 'top' | 'good' | 'ok' | 'even' | 'loss', label, pose (tư thế Dì Sáu ở DI_SAU_POSES), good (lời khen / lời tiếc) }
 */
export function shiftRank(profit, avg) {
  const p = Math.round(Number(profit) || 0)
  const a = Number(avg) || 0
  const good = p > 0 && (a === 0 || a >= 3.5)
  if (p < 0) return { key: 'loss', label: 'Ca này lỗ rồi', pose: 'che_mat', good }
  if (p === 0) return { key: 'even', label: 'Hòa vốn', pose: 'lau_mo_hoi', good }
  if (good && a >= 4.5) return { key: 'top', label: 'Ca xuất sắc!', pose: 'vo_tay', good }
  if (good) return { key: 'good', label: 'Ca suôn sẻ!', pose: 'ngon_cai', good }
  return { key: 'ok', label: 'Ca vất vả', pose: 'lau_mo_hoi', good }
}

/** Sao lớn: sao trung bình (0–5) → { full, half } (làm tròn tới nửa sao). */
export function starFill(avg) {
  const v = Math.max(0, Math.min(5, Math.round((Number(avg) || 0) * 2) / 2))
  return { full: Math.floor(v), half: v % 1 !== 0 }
}

// Hình của từng khoản trong sổ lãi lỗ.
export const LEDGER_ART = Object.freeze({
  cashSales: 'khau_tinh_tien', qrSales: 'dien_thoai', tips: 'hu_tip', debtIn: 'ghi_no', eventIn: 'cup',
  drawerDiff: 'khau_thanh_toan', cogs: 'ro', waste: 've_chai', refunds: 'doi_y', eventOut: 'kiem_tra_attp',
  fixedCost: 'tien_dien_nuoc'
})

/**
 * Các dòng sổ lãi lỗ (cộng lại đúng bằng lãi): [{ key, label, value, kind: 'plus' | 'minus' | 'signed', art }].
 * Luôn có: tiền mặt, chuyển khoản, tip, tiền sự kiện, giá vốn, phạt/chi sự kiện, chi phí cố định (e2e tìm dòng tip và hai
 * dòng tiền sự kiện). Các khoản còn lại (khách quen trả nợ, lệch két, hao hụt, hoàn tiền) chỉ hiện khi khác 0.
 */
export function ledgerRows(sum, SM = {}) {
  const n = v => Math.round(Number(v) || 0)
  const s = sum || {}
  const all = [
    ['cashSales', SM.cashSales || 'Doanh thu tiền mặt', n(s.cashSales), 'plus', true],
    ['qrSales', SM.qrSales || 'Doanh thu chuyển khoản', n(s.qrSales), 'plus', true],
    ['tips', SM.tips || 'Tiền tip', n(s.tips), 'plus', true],
    // M3: tiền khách quen trả nợ (tình huống ghi nợ ở ca trước)
    ['debtIn', 'Khách quen trả nợ', n(s.debtIn), 'plus', false],
    // M4: tiền thưởng từ sự kiện ngày / tình huống trong ca
    ['eventIn', SM.eventIn || 'Tiền từ sự kiện', n(s.eventIn), 'plus', true],
    ['drawerDiff', SM.drawerDiff || 'Lệch két', n(s.drawerDiff), 'signed', false],
    ['cogs', SM.cogs || 'Giá vốn', n(s.cogs), 'minus', true],
    ['waste', SM.waste || 'Hao hụt', n(s.waste), 'minus', false],
    ['refunds', SM.refunds || 'Hoàn tiền', n(s.refunds), 'minus', false],
    // M4: phạt, chi phí, tiền mua vì sự kiện (đã trừ Tiền quán lúc phát sinh)
    ['eventOut', SM.eventOut || 'Phạt, chi sự kiện', n(s.eventOut), 'minus', true],
    ['fixedCost', SM.fixedCost || 'Chi phí cố định', n(s.fixedCost), 'minus', true]
  ]
  return all.filter(r => r[4] || r[2] !== 0).map(([key, label, value, kind]) => ({ key, label, value, kind, art: LEDGER_ART[key] }))
}

/** Chữ số tiền của một dòng sổ (giữ đúng dạng cũ: dòng trừ "−20.000đ", dòng có dấu "+5.000đ" / "−5.000đ"). */
export function ledgerText(kind, v) {
  const x = Math.round(Number(v) || 0)
  if (kind === 'minus') return x ? '−' + formatVND(x) : formatVND(0)
  if (kind === 'signed') return signedVND(x)
  return formatVND(x)
}

// Kiểu khách vẽ cho khách vãng lai (tên không cho biết kiểu khách): chọn cố định theo tên.
const GUEST_PERSONAS = Object.freeze(['hoc_sinh', 'cong_nhan', 'van_phong', 'co_chu'])
function hashStr(s) {
  let x = 7
  for (const ch of String(s || '')) x = (x * 31 + ch.codePointAt(0)) >>> 0
  return x
}

/** Dáng một khách theo tên: khách quen / khách lạ dùng dáng riêng; khách khác chọn kiểu theo tên, giới tính theo kho tên. */
export function guestLook(name, data) {
  const D = data || {}
  const reg = Object.values(D.REGULARS || {}).find(r => r && r.name === name)
  if (reg) return { persona: reg.persona, opts: { gender: reg.gender, who: reg.id } }
  const str = (Array.isArray(D.STRANGERS) ? D.STRANGERS : []).find(s => s && s.name === name)
  if (str) return { persona: str.persona, opts: { gender: str.gender, who: str.id } }
  const N = D.NAMES || {}
  const gender = Array.isArray(N.nu) && N.nu.includes(name) ? 'nu' : (Array.isArray(N.nam) && N.nam.includes(name) ? 'nam' : null)
  return { persona: GUEST_PERSONAS[hashStr(name) % GUEST_PERSONAS.length], opts: gender ? { gender } : {} }
}

/**
 * Khách của ca: [{ name, stars, mood, persona, opts, lost }] — khách đã phục vụ (lời chấm trong ngày, đúng thứ tự giao),
 * rồi khách bỏ về (không tính khách dùng ảnh chuyển khoản giả bị bắt). Thiếu lời chấm (bản lưu cũ) thì lấy sum.ratings.
 */
export function guestList(sum, state, data) {
  const n = v => Math.max(0, Math.round(Number(v) || 0))
  const s = sum || {}
  const out = []
  const reviews = ((state && state.reviews) || []).filter(r => r && r.day === s.day)
  const served = reviews.length ? reviews.map(r => ({ name: r.name || '', stars: Number(r.stars) || 0 }))
    : (Array.isArray(s.ratings) ? s.ratings : []).map((st, i) => ({ name: '', stars: Number(st) || 0, i }))
  served.forEach((g, i) => {
    const look = g.name ? guestLook(g.name, data) : { persona: GUEST_PERSONAS[i % GUEST_PERSONAS.length], opts: {} }
    out.push({ name: g.name, stars: g.stars, mood: sheetMood(g.stars), ...look, lost: false })
  })
  const lost = Math.max(0, n(s.lost) - n(s.scamCaught))
  for (let k = 0; k < lost; k++) out.push({ name: '', stars: 0, mood: 'gian', persona: GUEST_PERSONAS[(k * 3 + 1) % GUEST_PERSONAS.length], opts: {}, lost: true })
  return out
}

/**
 * Thạo món của các món đang có: [{ id, name, art, level, levelName, good, from, next, max, up }].
 * from / next: số món ngon của mốc cấp hiện tại / cấp kế (next = null khi đã ở cấp cao nhất); up: vừa lên cấp trong ca.
 */
export function masteryRows(state, data, ups = new Set()) {
  const R = (data && data.RECIPES) || {}
  const levels = (data && data.BALANCE && data.BALANCE.masteryLevels) || [0, 5, 15]
  const names = (data && data.STRINGS && data.STRINGS.masteryLevels) || {}
  return Object.keys((state && state.recipes) || {}).filter(id => R[id]).map(id => {
    const p = state.recipes[id]
    const lv = masteryLevel(p, levels)
    const next = levels[lv] === undefined ? null : levels[lv]
    return {
      id, name: R[id].name, art: R[id].icon || id, level: lv, levelName: names[lv] || String(lv),
      good: Math.max(0, Math.round(Number(p && p.goodCooks) || 0)), from: levels[lv - 1] || 0, next, max: levels.length, up: ups.has(id)
    }
  })
}

// ---------- Món vừa lên cấp thạo món trong ca ----------
// Tổng kết (ca đã kết thúc) không còn từng món của ca; nghe 'dish.done' trên bus để ghi lại món vừa chạm mốc thạo món
// (recordDish chạy trước khi phát, goodCooks tăng đúng 1 mỗi món ngon → chạm đúng mốc = vừa lên cấp). Chỉ NGHE, không phát.
// trackMastery(app) cài một lần cho mỗi app (lần vào Tổng kết đầu tiên tự cài; gọi sớm hơn — lúc khởi động — để ghi được cả
// ca đầu tiên của phiên). Ngoài ra màn nhận params.levelUps / summary.levelUps (mảng id món) nếu nơi khác truyền vào.
const TRACKERS = new WeakMap()

/** Cài bộ ghi món lên cấp thạo món cho app (an toàn khi gọi nhiều lần). → true nếu app có bus. */
export function trackMastery(app) {
  if (!app || typeof app !== 'object' || !app.bus || typeof app.bus.on !== 'function') return false
  if (TRACKERS.has(app)) return true
  const rec = { day: null, ups: new Map() }
  TRACKERS.set(app, rec)
  app.bus.on('shift.started', p => { rec.day = p && p.day !== undefined ? p.day : null; rec.ups = new Map() })
  app.bus.on('dish.done', p => {
    try {
      const st = app.state
      const sh = st && st.shift
      if (!sh || !p || !GOOD_GRADES.includes(p.grade)) return
      if (rec.day !== sh.day) { rec.day = sh.day; rec.ups = new Map() }
      const prog = st.recipes && st.recipes[p.recipeId]
      const levels = (app.data && app.data.BALANCE && app.data.BALANCE.masteryLevels) || [0, 5, 15]
      const good = Math.round(Number(prog && prog.goodCooks) || 0)
      if (good > 0 && levels.includes(good)) rec.ups.set(p.recipeId, masteryLevel(prog, levels))
    } catch { /* chỉ để hiển thị: bỏ qua */ }
  })
  return true
}

/** Id các món vừa lên cấp thạo món ở ca ngày `day` (theo bộ ghi của app). */
export function levelUpsFor(app, day) {
  const rec = app && TRACKERS.get(app)
  return rec && rec.day === day ? [...rec.ups.keys()] : []
}

// ---------- Màn ----------

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS
    const SM = S.summary
    const D = app.data.DIALOGUE
    const state = app.state
    const hist = state.history || []
    const sum = params.summary || hist[hist.length - 1] || null
    trackMastery(app)
    const el = h('section', { class: 'summary-screen sum-v2', testid: 'summary' })
    root.appendChild(el)

    const timers = new Set()
    const observers = []
    let destroyed = false
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn() }, ms)
      timers.add(id)
      return id
    }
    const unmount = () => {
      destroyed = true
      for (const id of timers) clearTimeout(id)
      timers.clear()
      for (const o of observers) { try { o.disconnect() } catch { /* bỏ qua */ } }
    }

    if (!sum) {
      el.classList.add('is-static')
      el.appendChild(headBar(null))
      el.appendChild(h('p', { class: 'sum-empty' }, 'Chưa có ca nào để tổng kết.'))
      el.appendChild(nextBtn())
      return { unmount }
    }

    const n = v => Math.round(Number(v) || 0)
    const profit = n(sum.profit)
    const avg = Number(sum.avgStars) || 0
    const rank = shiftRank(profit, avg)
    const talk = rank.good ? pick(D.diSau.praise) : pick(D.diSau.regret)
    const drawerStart = sum.drawerExpected !== undefined ? n(sum.drawerExpected) - n(sum.cashSales) : null
    const net = profit - n(sum.loanRepaid)
    const key = [state.seed, state.shopName || '', sum.day, profit, n(sum.served), n(sum.lost)].join('|')
    const replay = PLAYED.has(key)
    PLAYED.add(key)
    const animate = !replay && !isReduced(app)
    el.classList.add(animate ? 'is-anim' : 'is-static')
    el.dataset.rank = rank.key

    // 1. Thanh gỗ dính đầu màn
    const bar = headBar(sum)
    el.appendChild(bar)
    const walletPill = bar.querySelector('[data-testid="summary-wallet"]')
    const walletNum = walletPill && walletPill.querySelector('.pill-num')
    if (animate && net !== 0 && walletNum) walletNum.textContent = formatMoneyShort(state.wallet - net)

    // 2. Băng rôn "Hết ca!": sao lớn, hạng ca, Dì Sáu, lãi trong ca
    const hero = heroView()
    el.appendChild(hero)

    // 3. Sổ lãi lỗ
    const ledgerCard = ledgerView()
    el.appendChild(ledgerCard)

    // 4. Chốt két
    if (drawerStart !== null) el.appendChild(drawerView())

    // 5. Khách hôm nay
    el.appendChild(guestsView())

    // 6. Tình huống, sự kiện trong ca, sổ ghi nợ
    const inc = incidentView()
    if (inc) el.appendChild(inc)

    // 7. Hàng hiếm cuối ca
    const rare = rareView()
    if (rare) el.appendChild(rare)

    // 8. Thạo món
    const ups = new Set([...(Array.isArray(params.levelUps) ? params.levelUps : []), ...(Array.isArray(sum.levelUps) ? sum.levelUps : []),
      ...levelUpsFor(app, sum.day)])
    const mastery = masteryView(ups)
    if (mastery) el.appendChild(mastery)

    // 9. Lỗi quầy / bếp + lời khuyên
    el.appendChild(errorsView())

    // 10. Lời khách
    const rv = reviewsView()
    if (rv) el.appendChild(rv)

    // 11. Mẹo của Dì Sáu
    const tip = tipView()
    if (tip) el.appendChild(tip)

    // 12. Tiến độ Việc hôm nay, chuỗi nhiệm vụ, Tem sự kiện
    const meta = metaProgress(app)
    if (meta) el.appendChild(meta)

    // 13. Sổ tay nghề có nhóm đủ thẻ chờ nhận thưởng
    const nbReady = notebookBadge(state, app.ctx)
    if (nbReady > 0) {
      el.appendChild(h('section', { class: 'sum-card sum-note sum-notebook', testid: 'summary-notebook' },
        cardHead('so_tay_nghe', 'Sổ tay nghề'),
        h('p', null, `Đủ thẻ ${nbReady} nhóm Mẹo nghề! Mở Sổ tay nghề ở màn Chuẩn bị để nhận danh hiệu và Muỗng Vàng.`)))
    }

    // 14. Ngày mai: sự kiện ngày báo trước + dự báo khách
    el.appendChild(tomorrowView())

    // M3: có bản mới của game → nút Tải lại (ca đã kết thúc nên tải lại an toàn)
    if (typeof app.updateSlot === 'function') el.appendChild(app.updateSlot())
    el.appendChild(nextBtn())

    if (animate) playIntro()
    return { unmount }

    // ---------- Các phần ----------

    function headBar(s) {
      const title = s ? `${SM.title} · Ngày ${s.day}` : SM.title
      return h('div', { class: 'sum-head-row sum-bar' },
        h('h1', { class: 'sum-bar-title', 'aria-label': title },
          h('span', { class: 'sum-bar-name', 'aria-hidden': 'true' }, 'Tổng kết'),
          s ? h('span', { class: 'sum-bar-day', 'aria-hidden': 'true' }, 'Ngày ' + s.day) : null),
        s ? moneyPill(state.wallet, 'summary-wallet', true) : null,
        helpButton(app, { className: 'sum-help' }))
    }

    function heroView() {
      const { full, half } = starFill(avg)
      const stars = []
      for (let k = 0; k < 5; k++) {
        const on = k < full
        const part = !on && half && k === full
        stars.push(h('span', { class: ['sum-star', on ? 'is-on' : '', part ? 'is-half' : ''], style: on || part ? { '--i': String(k) } : null },
          svgBox(STAR_SLOT, 'sum-star-bg'),
          on || part ? svgBox(STAR_ON, 'sum-star-fg') : null))
      }
      const starLabel = avg ? `${SM.avgStars}: ${formatStars(avg)} trên 5 sao` : `${SM.avgStars}: chưa có lượt chấm`
      const pose = DI_SAU_POSES[rank.pose] || DI_SAU_POSES.ngon_cai
      const resultLabel = profit >= 0 ? SM.profit : SM.loss
      return h('section', { class: ['sum-hero', 'rank-' + rank.key] },
        h('div', { class: ['g-ribbon', 'sum-ribbon', rank.key === 'top' ? 'g-ribbon--gold' : ''] }, 'Hết ca!'),
        h('div', { class: 'sum-hero-top' },
          h('div', { class: 'sum-stars', testid: 'summary-stars', role: 'img', 'aria-label': starLabel, title: starLabel },
            h('span', { class: 'sum-stars-row' }, stars),
            h('b', { class: 'sum-stars-num', 'aria-hidden': 'true' }, avg ? formatStars(avg) : '—')),
          h('p', { class: 'sum-rank' }, rank.label)),
        h('div', { class: 'sum-hero-main' },
          svgBox(pose, 'sum-disau'),
          h('div', { class: 'sum-bubble' }, h('b', null, 'Dì Sáu'), h('p', null, talk))),
        h('div', { class: ['sum-result', profit < 0 ? 'is-neg' : 'is-pos'], role: 'group', 'aria-label': `${resultLabel}: ${signedVND(profit)}` },
          svgBox(metaArt('xu'), 'sum-result-ico'),
          h('span', { class: 'sum-result-label', 'aria-hidden': 'true' }, resultLabel),
          h('b', { class: 'sum-result-num', 'aria-hidden': 'true' }, signedVND(animate ? 0 : profit))))
    }

    function ledgerView() {
      const rows = ledgerRows(sum, SM)
      const totalLabel = profit >= 0 ? SM.profit : SM.loss
      const stampText = profit > 0 ? 'LÃI' : profit < 0 ? 'LỖ' : 'HÒA'
      const table = h('table', { class: 'ledger sum-ledger' }, h('tbody', null,
        rows.map(r => h('tr', { class: ['sum-row', 'k-' + r.key, r.kind === 'minus' && r.value ? 'neg' : '', r.value === 0 ? 'is-zero' : ''], dataset: { k: r.key } },
          h('td', { class: 'sum-lbl' }, svgBox(artOf(r.art), 'sum-row-ico'), h('span', { class: 'sum-lbl-text' }, r.label)),
          h('td', { class: 'num', dataset: { kind: r.kind, value: r.value } }, h('span', { class: 'sum-amt' }, ledgerText(r.kind, r.value))))),
        h('tr', { class: ['total', profit >= 0 ? 'pos' : 'neg'] },
          h('td', { class: 'sum-lbl' },
            h('span', { class: ['sum-stamp', profit > 0 ? 'is-pos' : profit < 0 ? 'is-neg' : 'is-even'], 'aria-hidden': 'true' }, stampText),
            h('span', { class: 'sum-lbl-text' }, totalLabel)),
          h('td', { class: 'num', testid: 'summary-profit', dataset: { amount: profit, kind: 'total', value: profit } },
            h('span', { class: 'sum-amt' }, signedVND(profit))))))
      const info = [
        [SM.undercharge, n(sum.undercharge)], [SM.overchange, n(sum.overchange)],
        ['Làm tròn cho khách', n(sum.rounding)], [SM.fakeQrLoss, n(sum.fakeQrLoss)]
      ].filter(([, v]) => v > 0)
      return h('section', { class: 'sum-card sum-sheet sum-ledger-card' },
        cardHead('ghi_no', 'Sổ lãi lỗ ca'),
        table,
        info.length ? h('ul', { class: 'ledger-info sum-ledger-info' },
          info.map(([label, v]) => h('li', null, `${label}: ${formatVND(v)}`)),
          h('li', { class: 'muted' }, 'Các khoản trên đã nằm trong tiền két và lãi.')) : null,
        n(sum.loanRepaid) ? h('p', { class: 'sum-line sum-loan' }, svgBox(DI_SAU_FACES.vui, 'sum-line-ico'),
          h('span', null, `Trả nợ Dì Sáu: ${formatVND(sum.loanRepaid)}`)) : null,
        // M4: nhắc luật tip một mức (viết theo hướng thưởng)
        S.labels.tipRule ? h('p', { class: 'sum-line sum-tip-rule' }, svgBox(SCENE.hu_tip, 'sum-line-ico'),
          h('span', { testid: 'summary-tip-rule' }, S.labels.tipRule + '.')) : null)
    }

    function drawerView() {
      const diff = n(sum.drawerDiff)
      const ok = diff === 0
      return h('section', { class: ['sum-card', 'sum-drawer', ok ? 'is-ok' : 'is-off'] },
        cardHead(null, 'Chốt két', null, SCENE.ket_tien, 'sum-card-ico--wide'),
        h('table', { class: 'sum-drawer-table' }, h('tbody', null,
          tr('Két đầu ca (quỹ tiền lẻ)', formatVND(drawerStart)),
          tr('Thu tiền mặt', '+' + formatVND(sum.cashSales)),
          tr(SM.drawerExpected, formatVND(sum.drawerExpected)),
          tr(SM.drawerActual, formatVND(sum.drawerActual)),
          h('tr', { class: ['total', ok ? 'pos' : 'neg'] },
            h('td', null, svgBox(ok ? OK_ART : BAD_ART, 'sum-mark'), h('span', null, SM.drawerDiff)),
            h('td', { class: 'num', testid: 'summary-drawer-diff' }, signedVND(diff))))),
        h('p', { class: 'sum-hint' }, ok ? 'Két khớp từng đồng. Giỏi lắm!'
          : (diff < 0 ? 'Két hụt: có lần thối dư hoặc làm tròn cho khách.' : 'Két dư: có lần thối thiếu mà khách không biết.')))
    }

    function guestsView() {
      const list = guestList(sum, state, app.data)
      const MAX = 12
      const shown = list.slice(0, MAX)
      const more = list.length - shown.length
      const lostN = Math.max(0, n(sum.lost) - n(sum.scamCaught))
      const faces = shown.map((g, i) => {
        const label = g.lost ? 'Khách bỏ về' : `${g.name || 'Khách'}: ${g.stars} sao`
        return h('span', { class: ['sum-face', 'mood-' + g.mood, g.lost ? 'is-lost' : ''], role: 'img', 'aria-label': label, title: label, style: { '--i': String(i) } },
          svgBox(safeBust(g.persona, g.mood, g.opts), 'sum-face-img'),
          g.lost ? h('span', { class: 'sum-face-tag', 'aria-hidden': 'true' }, 'Bỏ về')
            : svgBox(EMOTES[emoteKey(g.stars)] || '', 'sum-face-emote'))
      })
      const repGain = n(sum.reputationGain)
      return h('section', { class: 'sum-card sum-guests' },
        cardHead('tab_quay', 'Khách hôm nay', h('span', { class: 'sum-card-tag' }, `${n(sum.served)} khách`)),
        list.length ? h('div', { class: 'sum-faces' }, faces, more > 0 ? h('span', { class: 'sum-face-more' }, '+' + more) : null)
          : h('p', { class: 'sum-hint' }, 'Hôm nay chưa có khách nào.'),
        // khách trả bằng ảnh chuyển khoản giả bị bắt là làm đúng: tách khỏi số khách bỏ về
        h('p', { class: 'sum-guest-line' }, `${SM.served}: ${n(sum.served)} · ${SM.lost}: ${lostN}` +
          (n(sum.scamCaught) ? ` · Bắt được ảnh chuyển khoản giả: ${n(sum.scamCaught)}` : '') +
          (n(sum.missed) ? ` · ${SM.missed}: ${n(sum.missed)}` : '')),
        h('div', { class: 'sum-rep' },
          h('span', { class: 'sum-chip', role: 'img', 'aria-label': `${S.labels.reputation}: ${state.reputation} · ${SM.reputationGain}: +${repGain}`, title: `${SM.reputationGain}: +${repGain}` },
            svgBox(metaArt('danh_hieu'), 'sum-chip-ico'),
            h('span', { class: 'sum-chip-text', 'aria-hidden': 'true' }, h('small', null, S.labels.reputation), h('b', null, String(state.reputation))),
            h('b', { class: ['sum-chip-gain', repGain > 0 ? 'is-up' : ''], 'aria-hidden': 'true' }, '+' + repGain))))
    }

    function incidentView() {
      // M3: Tình huống trong ca và sổ ghi nợ (bản rút gọn trong lịch sử chỉ có id + lựa chọn: tra tên từ dữ liệu)
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
      if (!incidents.length && !debtNotes.length && !eventNotes.length) return null
      const title = incidents.length && eventNotes.length ? 'Tình huống và sự kiện trong ca'
        : incidents.length || debtNotes.length ? 'Tình huống trong ca' : 'Sự kiện trong ca'
      return h('section', { class: 'sum-card sum-incident', testid: 'summary-incident', dataset: {
        incident: incidents[0] ? incidents[0].id : '', choice: incidents[0] ? incidents[0].choice : '' } },
      cardHead(incidents.length ? null : 'su_kien', title, null, incidents.length ? (metaArt(incidents[0].id) || metaArt('su_kien')) : null),
      incidents.map(r => h('div', { class: 'sum-incident-item' },
        svgBox(metaArt(r.id) || metaArt('su_kien'), 'sum-incident-art'),
        h('div', { class: 'sum-incident-body' },
          h('b', { class: 'sum-incident-name' }, r.name),
          h('p', { class: 'sum-incident-choice' }, 'Bạn chọn: ' + r.label + (r.safe ? ' (cách an toàn)' : '')),
          r.text ? h('p', { class: 'sum-incident-text' }, r.text) : null,
          h('ul', { class: 'sum-incident-fx' }, incidentLines(r).map(t => h('li', { class: fxTone(t) }, t)))))),
      eventNotes.length ? h('ul', { class: 'sum-event-notes', testid: 'summary-event-money' }, eventNotes.map(x =>
        h('li', { class: n(x.money) > 0 ? 'is-plus' : n(x.money) < 0 ? 'is-minus' : '', dataset: { event: x.id || '', money: String(n(x.money)) } },
          svgBox(metaArt(x.id) || metaArt('su_kien'), 'sum-ev-ico'),
          h('span', { class: 'sum-ev-text' },
            (x.name ? h('b', null, x.name + ': ') : null),
            [n(x.money) ? signedVND(n(x.money)) : '', x.fx || ''].filter(Boolean).join(', ') || 'không tính tiền',
            x.text ? ' · ' + x.text : '')))) : null,
      debtNotes.map(d => h('p', { class: ['sum-debt', d.kind === 'tra' ? 'is-paid' : 'is-unpaid'], testid: 'summary-debt' },
        svgBox(metaArt('ghi_no'), 'sum-line-ico'), h('span', null, d.text))),
      h('p', { class: 'sum-hint' }, 'Tiền của tình huống và sự kiện đã nằm trong sổ lãi lỗ ở trên.'))
    }

    function rareView() {
      // M4: quà hàng hiếm cuối ca (khách lạ, Giỏ chợ) — không phải tiền nên không nằm trong sổ lãi lỗ
      const notes = sum.rareNotes || sum.rare || []
      if (!notes.length) return null
      const STR = Array.isArray(app.data.STRANGERS) ? app.data.STRANGERS : []
      return h('section', { class: 'sum-card sum-rare', testid: 'summary-rare' },
        cardHead('kho_hiem', 'Hàng hiếm cuối ca'),
        notes.map(x => {
          const stranger = x.kind === 'khach_la' ? STR.find(s => s.name === x.name) : null
          const who = stranger ? safeBust(stranger.persona, (x.stars || 0) >= 3 ? 'vui' : 'binh_thuong', { gender: stranger.gender, who: stranger.id })
            : metaArt('luot_gio_cho')
          const tiles = []
          for (const g of (x.got || []).filter(g => g.n > 0)) {
            tiles.push(itemTile(icon(g.id), { kind: 'rare', qty: '+' + g.n, name: g.name, label: `+${g.n} phần ${g.name}` }))
          }
          if (x.fragment && x.fragment.n > 0) {
            tiles.push(itemTile(metaArt('manh_cong_thuc'), { kind: 'fragment', qty: '+' + x.fragment.n, name: 'Mảnh ' + x.fragment.name,
              label: `+${x.fragment.n} mảnh công thức ${x.fragment.name}` }))
          }
          if (x.spoons > 0) {
            tiles.push(itemTile(metaArt('muong_vang'), { kind: 'gold', qty: '+' + x.spoons, name: 'Muỗng Vàng',
              label: `+${x.spoons} Muỗng Vàng (kho hoặc mức hôm nay đã đủ)` }))
          }
          return h('div', { class: 'sum-rare-item', dataset: { kind: x.kind || '' } },
            svgBox(who, ['sum-rare-who', stranger ? 'is-bust' : ''].join(' ')),
            h('div', { class: 'sum-rare-body' },
              h('b', null, x.kind === 'khach_la' ? `${x.name} (khách lạ${x.stars ? `, ${x.stars} sao` : ''})` : (x.name || 'Giỏ chợ')),
              x.text ? h('p', { class: 'sum-rare-text' }, x.text) : null,
              tiles.length ? h('div', { class: 'sum-rare-tiles' }, tiles) : null))
        }),
        h('p', { class: 'sum-hint' }, notes.some(x => (x.got || []).some(g => g.n > 0))
          ? 'Hàng hiếm cất vào kho, xem ở màn Chuẩn bị. Không tính vào Tiền quán.'
          : 'Hàng hiếm và Muỗng Vàng không tính vào Tiền quán.'))
    }

    function masteryView(upSet) {
      const rows = masteryRows(state, app.data, upSet)
      if (!rows.length) return null
      // món vừa lên cấp lên đầu
      rows.sort((a, b) => Number(b.up) - Number(a.up))
      return h('section', { class: ['sum-card', 'sum-mastery', rows.some(r => r.up) ? 'has-up' : ''] },
        cardHead('sao_lon', S.labels.mastery),
        h('ul', { class: 'sum-mastery-list' }, rows.map(r => {
          const atMax = r.next === null
          const label = atMax ? `${r.name}: ${r.levelName}, đã thạo hết cấp` : `${r.name}: ${r.levelName}, ${r.good}/${r.next} món ngon`
          const pips = []
          for (let k = 1; k <= r.max; k++) pips.push(svgBox(k <= r.level ? STAR_ON : PIP_OFF, ['sum-pip', k <= r.level ? 'is-on' : ''].join(' ')))
          return h('li', { class: ['sum-dish', r.up ? 'is-up' : '', atMax ? 'is-max' : ''], dataset: { recipe: r.id, level: r.level } },
            h('span', { class: 'sum-dish-art' }, svgBox(icon(r.art), 'sum-dish-img'), r.up ? svgBox(UP_ART, 'sum-dish-up') : null),
            h('div', { class: 'sum-dish-body' },
              h('div', { class: 'sum-dish-top' },
                h('b', { class: 'sum-dish-name' }, r.name),
                r.up ? h('span', { class: 'sum-up-tag' }, 'Lên cấp!') : null),
              h('div', { class: 'sum-dish-lv' },
                h('span', { class: 'sum-pips', 'aria-hidden': 'true' }, pips),
                h('span', { class: 'sum-dish-lvname' }, r.levelName)),
              h('div', { class: 'sum-dish-prog' },
                progressBar(atMax ? 1 : r.good - r.from, atMax ? 1 : r.next - r.from, { label, cap: atMax ? 'star' : false }),
                h('span', { class: 'sum-dish-num' }, atMax ? 'Thạo hết cấp' : `${r.good}/${r.next} món ngon`))))
        })))
    }

    function errorsView() {
      const advice = sum.advice && sum.advice.text ? sum.advice.text : null
      const errCol = (obj, title, art) => {
        const keys = Object.keys(obj || {})
        return h('div', { class: ['sum-err-col', keys.length ? 'has-err' : 'is-clean'] },
          h('h3', { class: 'sum-err-title' }, svgBox(artOf(art), 'sum-err-ico'), h('span', null, title)),
          keys.length ? h('ul', { class: 'sum-err-list' }, keys.map(k => h('li', null, h('span', null, S.errors[k] || k), h('b', null, '×' + obj[k]))))
            : h('p', { class: 'sum-err-none' }, svgBox(OK_ART, 'sum-mark'), h('span', null, 'Không có lỗi nào')))
      }
      const clean = !Object.keys(sum.counterErrors || {}).length && !Object.keys(sum.kitchenErrors || {}).length
      return h('section', { class: ['sum-card', 'sum-errors', clean ? 'is-clean' : ''] },
        clean ? h('div', { class: 'sum-err-clean' },
          svgBox(artOf('tab_quay'), 'sum-err-ico'), svgBox(artOf('tab_bep'), 'sum-err-ico'),
          h('p', { class: 'sum-err-none' }, svgBox(OK_ART, 'sum-mark'),
            h('span', null, `${S.labels.counterError}, ${S.labels.kitchenError.toLocaleLowerCase('vi-VN')}: không có lỗi nào`)))
          : h('div', { class: 'sum-err-cols' },
            errCol(sum.counterErrors, S.labels.counterError, 'tab_quay'),
            errCol(sum.kitchenErrors, S.labels.kitchenError, 'tab_bep')),
        advice ? h('div', { class: 'sum-advice', testid: 'summary-advice' }, svgBox(DI_SAU_FACES.lo, 'sum-advice-face'),
          h('p', null, h('b', null, 'Lời khuyên: '), advice)) : null)
    }

    function reviewsView() {
      const reviews = (state.reviews || []).filter(r => r.day === sum.day && r.text).slice(-3)
      if (!reviews.length) return null
      return h('section', { class: 'sum-card sum-reviews' },
        cardHead(null, 'Khách nói gì', null, metaArt('thu')),
        h('ul', { class: 'review-list sum-review-list', testid: 'summary-reviews' }, reviews.map(r => {
          const look = guestLook(r.name, app.data)
          const st = Math.max(0, Math.min(5, Math.round(Number(r.stars) || 0)))
          const pips = []
          for (let k = 0; k < 5; k++) pips.push(svgBox(k < st ? STAR_ON : PIP_OFF, 'sum-pip'))
          return h('li', { class: 'sum-review' },
            svgBox(safeHead(look.persona, sheetMood(r.stars), look.opts), 'sum-review-face'),
            h('div', { class: 'sum-review-body' },
              h('div', { class: 'sum-review-top' }, h('b', null, r.name),
                h('span', { class: 'sum-pips', role: 'img', 'aria-label': `${st} sao` }, pips)),
              h('p', null, '“' + r.text + '”')))
        })))
    }

    function tipView() {
      const tips = Array.isArray(app.data.TIPS) ? app.data.TIPS : []
      const advice = sum.advice && sum.advice.text ? sum.advice.text : null
      // thẻ vừa mở lúc kết ca (mới nhất trong tipsSeen) được ưu tiên; không lặp lại thẻ đã nằm trong "Lời khuyên"
      const seen = state.tipsSeen || []
      const lastSeen = tips.find(t => t.id === seen[seen.length - 1])
      const fresh = lastSeen && lastSeen.trigger === 'shift_end' ? lastSeen : null
      const adviceTip = sum.advice && sum.advice.tipId && !advice ? tips.find(t => t.id === sum.advice.tipId) : null
      const tip = fresh || adviceTip ||
        tips.find(t => t.trigger === 'shift_end' && seen.includes(t.id)) ||
        pick(tips.filter(t => seen.includes(t.id) && !(sum.advice && t.id === sum.advice.tipId)))
      if (!tip) return null
      return h('section', { class: 'sum-card sum-note sum-tip', testid: 'summary-tip' },
        cardHead('so_tay_nghe', SM.advice),
        h('p', { class: 'sum-tip-text' }, h('b', null, tip.title + ': '), tip.text))
    }

    function tomorrowView() {
      // sự kiện ngày báo trước (tính theo ngày game kế tiếp)
      const tomorrow = dayEventInfo(state, state.day, app.ctx)
      let evEl = null
      if (tomorrow) {
        const effects = dayEventEffects(tomorrow, app.ctx)
        const lines = dayEffectLines(effects, app.data, state)
        let items = []
        try { items = dayEffectItems(effects, app.data, state) } catch { items = [] }
        const warn = dayEventWarnLine(state, tomorrow, app.data)
        evEl = h('div', { class: ['sum-dayev', 'kind-' + (tomorrow.kind || 'tot')], testid: 'summary-day-event', dataset: { event: tomorrow.id } },
          h('div', { class: 'sum-dayev-head' }, svgBox(metaArt(tomorrow.icon || tomorrow.id) || icon(tomorrow.icon || tomorrow.id), 'sum-dayev-ico'),
            h('div', null, h('small', { class: 'sum-kicker' }, 'Báo trước'),
              h('b', { class: 'sum-dayev-name' }, S.meta.tomorrowEvent.replace('{name}', tomorrow.name)))),
          h('p', { class: 'sum-dayev-desc' }, tomorrow.desc),
          lines.length ? h('ul', { class: 'sum-dayev-fx' }, lines.map((t, i) => {
            const it = items[i] && items[i].text === t ? items[i] : null
            const art = it ? effectArt(it.art) : ''
            return h('li', { class: art ? 'has-ico' : 'no-ico' }, art ? svgBox(art, 'sum-fx-ico') : null, h('span', null, t))
          })) : null,
          warn ? h('p', { class: 'sum-dayev-warn' }, warn) : null,
          tomorrow.choice ? h('p', { class: 'sum-dayev-tip' }, tomorrow.choice.free
            ? 'Bạt che mưa sẽ tự căng, không tốn tiền.'
            : `Có thể chọn "${tomorrow.choice.label}" (${choiceCostText(tomorrow.choice)}) ở màn Chuẩn bị.`) : null)
      }
      // Sao trung bình của 30 lượt gần nhất (khác "Sao ca này" ở trên); dưới 5 lượt là số tạm tính (đệm 4 sao)
      const fewRatings = (state.ratings || []).length < 5
      const crowd = ['hoc_sinh', 'cong_nhan', 'van_phong'].map(p => (HEADS[p] && HEADS[p].vui) || '')
      return h('section', { class: ['sum-card', 'sum-morrow', tomorrow ? 'has-event' : ''] },
        cardHead('o_lich', SM.tomorrow, h('span', { class: 'sum-card-tag' }, 'Ngày ' + state.day)),
        evEl,
        h('div', { class: 'sum-forecast' },
          h('span', { class: 'sum-crowd', 'aria-hidden': 'true' }, crowd.map(c => svgBox(c, 'sum-crowd-face'))),
          h('p', { testid: 'summary-tomorrow' },
            `Ngày mai (ngày ${state.day}): khoảng ${forecastCustomers(state, app.ctx, tomorrow)} khách · Sao trung bình (30 lượt gần nhất) ★ ${formatStars(averageRating(state.ratings))}` +
            (fewRatings ? ' · tính tạm, cần đủ 5 lượt' : ''))))
    }

    function nextBtn() {
      return h('div', { class: 'sticky-foot sum-foot' }, h('button', {
        class: 'btn btn-primary btn-big sum-next', type: 'button', testid: 'next-day',
        onclick: () => { app.sound('click'); app.saveNow(); app.go('prep') }
      },
      h('span', { class: 'sum-next-hook sum-next-hook-l', 'aria-hidden': 'true' }),
      h('span', { class: 'sum-next-hook sum-next-hook-r', 'aria-hidden': 'true' }),
      h('span', { class: 'sum-next-face' },
        svgBox(metaArt('o_lich'), 'sum-next-ico'),
        h('span', { class: 'sum-next-text' },
          h('b', null, SM.tomorrow),
          h('small', null, `Chuẩn bị ngày ${state.day}`)))))
    }

    // ---------- Hiệu ứng vào màn (một lần cho mỗi ca) ----------
    function playIntro() {
      const F = SUMMARY_FX
      const fx = app.vfx || null
      const { full, half } = starFill(avg)
      const nStars = full + (half ? 1 : 0)
      const starsDone = F.starStart + Math.max(0, nStars - 1) * F.starGap + F.starMs
      // sao lớn: CSS bật lần lượt (--i); sao cuối chạm thì nổ sao nhỏ + kèn
      later(() => {
        const row = el.querySelector('.sum-stars-row')
        if (fx && row && nStars >= 4) { try { fx.burst(row, 'star', { n: nStars >= 5 ? 8 : 5 }) } catch { /* bỏ qua */ } }
        if (rank.key === 'top' || rank.key === 'good') app.sound('fanfare')
        else if (nStars) app.sound('sparkle')
      }, Math.max(F.starStart, starsDone - 120))

      // số "Lãi trong ca" đếm lên, rồi xu bay về viên Tiền quán (có lãi) và viên đếm theo
      later(() => {
        const num = el.querySelector('.sum-result-num')
        if (!num) return
        const done = countEl(num, 0, profit, F.heroCount, signedVND)
        Promise.resolve(done).then(() => {
          if (destroyed) return
          const res = el.querySelector('.sum-result')
          if (fx && res && profit > 0) { try { fx.glow(res) } catch { /* bỏ qua */ } }
          walletFx()
        })
      }, F.heroAt)

      // tờ sổ: số đếm lên khi sổ hiện ra trên màn, xong thì đóng dấu dòng lãi
      whenSeen(ledgerCard, () => countLedger())

      // thạo món: thanh tiến độ chạy khi thẻ hiện ra; món vừa lên cấp nổ lấp lánh
      if (mastery) {
        whenSeen(mastery, () => {
          mastery.classList.add('is-in')
          const upEls = [...mastery.querySelectorAll('.sum-dish.is-up .sum-dish-art')]
          if (upEls.length) {
            later(() => {
              for (const u of upEls) { try { if (fx) fx.burst(u, 'sparkle', { n: 10 }) } catch { /* bỏ qua */ } }
              app.sound('sparkle')
            }, 420)
          }
        })
      }

      // nút "Ngày mai" nảy nhẹ MỘT lần sau khi sao bật xong (chỉ mặt nút; khung nút đứng yên, vùng chạm không đổi)
      later(() => {
        const face = el.querySelector('.sum-next-face')
        if (fx && face) { try { fx.squash(face) } catch { /* bỏ qua */ } }
      }, starsDone + 500)
    }

    function walletFx() {
      if (!walletPill || !walletNum || net === 0) return
      const fx = app.vfx || null
      const from = el.querySelector('.sum-result-ico')
      const before = state.wallet - net
      if (fx && from && net > 0 && typeof fx.coins === 'function') {
        try { fx.coins(from, walletPill, 8, { amount: net }) } catch { /* bỏ qua */ }
        later(() => countEl(walletNum, before, state.wallet, SUMMARY_FX.walletMs, formatMoneyShort), 380)
      } else {
        countEl(walletNum, before, state.wallet, SUMMARY_FX.walletMs, formatMoneyShort)
      }
    }

    function countLedger() {
      const cells = [...ledgerCard.querySelectorAll('table.ledger td.num')]
      const jobs = cells.map(td => {
        const kind = td.dataset.kind || 'plus'
        const v = Number(td.dataset.value) || 0
        if (!v) return Promise.resolve(true)
        return countOverlay(td, kind === 'total' || kind === 'signed' ? v : Math.abs(v), SUMMARY_FX.rowCount,
          kind === 'total' ? signedVND : x => ledgerText(kind, x))
      })
      Promise.all(jobs).then(() => {
        if (destroyed) return
        later(() => {
          const stamp = ledgerCard.querySelector('.sum-stamp')
          if (!stamp) return
          stamp.classList.add('is-slam')
          app.sound('stamp')
          if (app.vfx && profit > 0) { try { app.vfx.burst(stamp, 'star', { n: 6 }) } catch { /* bỏ qua */ } }
        }, SUMMARY_FX.stampGap)
      })
    }

    // Đếm số trên el (ghi thẳng chữ của el — chỉ dùng cho chữ không có testid). → Promise
    function countEl(target, from, to, ms, fmt) {
      const fx = app.vfx
      if (!fx || typeof fx.countUp !== 'function') { target.textContent = fmt(to); return Promise.resolve(true) }
      try { return fx.countUp(target, from, to, ms, fmt, { step: 500, glow: false }).done } catch { target.textContent = fmt(to); return Promise.resolve(true) }
    }

    // Đếm số của một ô sổ lãi lỗ mà KHÔNG đổi chữ thật trong ô: số đang đếm ghi vào data-shown, CSS vẽ bằng ::after.
    function countOverlay(td, to, ms, fmt) {
      const fx = app.vfx
      if (!fx || typeof fx.countUp !== 'function') return Promise.resolve(true)
      const sink = {
        ownerDocument: td.ownerDocument,
        get textContent() { return td.dataset.shown || '' },
        set textContent(v) { td.dataset.shown = String(v) }
      }
      td.classList.add('is-counting')
      let h0
      try { h0 = fx.countUp(sink, 0, to, ms, fmt, { step: 500, glow: false }) } catch { h0 = null }
      const done = h0 && h0.done ? h0.done : Promise.resolve(true)
      return done.then(ok => {
        td.classList.remove('is-counting')
        delete td.dataset.shown
        return ok
      })
    }

    // Gọi fn MỘT lần khi phần tử hiện ra trên màn (IntersectionObserver; không có thì gọi ngay).
    function whenSeen(target, fn) {
      if (!target) return
      const IO = typeof window !== 'undefined' ? window.IntersectionObserver : null
      if (!IO) { later(fn, 0); return }
      let fired = false
      const o = new IO(entries => {
        if (fired || destroyed) return
        if (entries.some(e => e.isIntersecting && e.intersectionRatio > 0)) {
          fired = true
          o.disconnect()
          fn()
        }
      }, { threshold: [0, 0.35] })
      observers.push(o)
      o.observe(target)
    }

    // ---------- Mảnh nhỏ ----------
    function cardHead(art, title, extra = null, svg = null, icoCls = '') {
      const pic = svg || artOf(art)
      return h('header', { class: 'sum-card-head' },
        pic ? svgBox(pic, ['sum-card-ico', icoCls].filter(Boolean).join(' ')) : null,
        h('h2', { class: 'sum-card-title' }, title),
        extra)
    }
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

// Sắc của một dòng hiệu ứng tình huống (chỉ để tô màu viên chữ; chữ giữ nguyên).
function fxTone(t) {
  if (/: \+|^Ca sau|đỡ giùm/.test(t)) return 'is-plus'
  if (/−/.test(t)) return 'is-minus'
  return 'is-info'
}

function tr(label, value) {
  return h('tr', null, h('td', null, label), h('td', { class: 'num' }, value))
}

function pick(arr) {
  return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''
}

function safeBust(persona, mood, opts) {
  try { const s = bust(persona, mood, opts); return typeof s === 'string' ? s : '' } catch { return '' }
}

function safeHead(persona, mood, opts) {
  try { const s = head(persona, mood, opts); return typeof s === 'string' ? s : '' } catch { return '' }
}

// Hình của một dòng ảnh hưởng sự kiện ngày (trường art của prep.dayEffectItems) → chuỗi SVG ('' nếu không có).
function effectArt(id) {
  if (!id) return ''
  if (id === 'nguoi_vui') return (HEADS.cong_nhan && HEADS.cong_nhan.vui) || ''
  if (id === 'nguoi_buc') return (HEADS.kho_tinh && HEADS.kho_tinh.buc) || ''
  return artOf(id)
}

// Tiến độ meta sau ca: Việc hôm nay (nhận ở màn Chuẩn bị), bước chuỗi đang làm, Tem sự kiện hôm nay.
function metaProgress(app) {
  const state = app.state
  const M = app.data.STRINGS.meta
  let nowInfo = null
  try { nowInfo = app.nowInfo() } catch { nowInfo = null }
  const ql = questList(state, app.ctx)
  const rows = []
  if (ql.quests.length) {
    const claim = ql.quests.filter(q => q.canClaim).length
    rows.push(h('div', { class: 'sum-meta-block', testid: 'summary-quests' },
      h('h3', { class: 'sum-meta-title' }, svgBox(metaArt('viec_hom_nay'), 'sum-meta-ico'),
        h('span', null, M.quests + (claim ? ` · ${claim} việc chờ nhận thưởng` : ''))),
      h('ul', { class: 'sum-quests' }, ql.quests.map(q => {
        const def = questDef(app.ctx, q.id) || {}
        const num = def.money ? `${formatVND(q.progress)}/${formatVND(q.target)}` : `${q.progress}/${q.target}`
        return h('li', { class: q.done ? 'is-done' : '' },
          h('span', { class: 'sq-text' }, q.done ? svgBox(metaArt('dau_tick'), 'sq-tick') : null, h('span', null, q.text)),
          h('span', { class: 'sq-num' }, num),
          progressBar(q.progress, q.target, { cap: false }))
      })),
      claim || ql.chest.available ? h('p', { class: 'sum-hint' }, 'Nhận thưởng ở màn Chuẩn bị, mục Việc hôm nay.') : null))
  }
  if (nowInfo) {
    const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.done || c.claimable.length)
    for (const c of chains) {
      // chuỗi sự kiện nhận ở màn sự kiện; chuỗi thường ở màn Chuẩn bị
      const where = c.eventId ? 'nhận thưởng ở màn sự kiện' : 'nhận thưởng ở màn Chuẩn bị'
      rows.push(h('div', { class: ['sum-meta-block', c.claimable.length ? 'has-claim' : ''], testid: c.eventId ? 'summary-event-chain' : 'summary-chain' },
        h('h3', { class: 'sum-meta-title' }, svgBox(c.eventId ? (metaArt(c.eventId) || metaArt('su_kien')) : npcFace(c.npc), 'sum-meta-ico'),
          h('span', null, `${chainTitle(c)}: ${c.claimable.length ? `xong ${c.claimable.length} bước, ${where}` : `bước ${c.step + 1}/${c.total}`}`)),
        c.done ? null : h('p', { class: 'sum-meta-text' }, c.text + (c.isCheck || c.gateLocked ? '' : ` (${c.progress}/${c.target})`))))
    }
    for (const ev of eventsOverview(state, nowInfo, app.ctx).filter(e => e.phase === 'dang_dien_ra')) {
      rows.push(h('div', { class: 'sum-meta-block', testid: 'summary-event' },
        h('h3', { class: 'sum-meta-title' }, svgBox(metaArt('tem'), 'sum-meta-ico'), h('span', null, `${ev.name}: ${ev.tem} ${ev.currencyName}`)),
        h('p', { class: 'sum-meta-text' }, `Hôm nay từ món ăn ${ev.temToday}/${ev.dailyCap} ${ev.currencyName}.`)))
    }
  }
  if (!rows.length) return null
  return h('section', { class: 'sum-card sum-meta' },
    h('header', { class: 'sum-card-head' }, svgBox(metaArt('viec_hom_nay'), 'sum-card-ico'), h('h2', { class: 'sum-card-title' }, 'Việc và chuỗi nhiệm vụ')),
    rows)
}
