// Màn Bếp (panel con của màn ca bán): dây phiếu → chọn nguyên liệu → Thớt sơ chế → Ra món → Giao cho khách.
// Giao diện với khung app: mountKitchen(root, app, opts?) → { unmount(), update(dt), onShow(), onHide(), selectTicket(id) }.
// opts.tasting = { onDone(dish) }: chế độ NẤU THỬ ở Chợ Công Thức (app là app "hộp cát" có state/ctx riêng):
// không đếm giờ (giới hạn bước nới rộng, ẩn thanh thời gian), không nút về dây phiếu / bỏ món, Ra món xong gọi onDone.
import { h, svgBox, clear } from '../dom.js'
import { upper, formatVND } from '../format.js'
import { icon, DI_SAU } from '../art.js'
import {
  startCook, submitChon, boardSteps, beginStep, getStep, submitStep, autoStep, retryStep,
  finishDish, abandonDish, serveTicket, effectiveSteps, chonDraft, saveChonDraft
} from '../../core/kitchen.js'
import { zoneMul } from '../../core/minigame-scoring.js'
import { playStep, hintFor, skinFor } from '../minigames/index.js'
import { uiRand, hashKey } from '../minigames/_util.js'
import { rareStock } from '../../core/rare.js'

export const HINT_MS = 800
export const REVEAL_MS = 1200
export const HINT_HIDE_AFTER_COOKS = 3
// Chặn click ma: chỉ bỏ click đến trong khoảng này sau lần chạm (một cú chạm thường nhấc ngón trong vài trăm ms).
export const TAP_GUARD_MS = 1000

// Mức ngân sách chờ → màu viền phiếu: xanh < 50%, vàng 50–80%, đỏ > 80% (nhấp nháy).
export function waitLevel(ratio) {
  if (ratio > 0.8) return 'red'
  if (ratio >= 0.5) return 'yellow'
  return 'green'
}

export function waitRatio(sh, ticket) {
  const c = sh && sh.customers && sh.customers[ticket.customerId]
  if (!c || !c.waitBudget) return 0
  const start = ticket.remake ? ticket.createdAt : (c.waitStart ?? ticket.createdAt)
  return Math.max(0, (sh.t - start) / c.waitBudget)
}

// Biểu cảm Dì Sáu theo hạng món.
export function moodForGrade(grade) {
  if (grade === 'tuyet_hao') return 'tu_hao'
  if (grade === 'ngon') return 'vui'
  if (grade === 'hong') return 'tiec'
  return 'lo'
}

const lowerFirst = s => (s ? s.charAt(0).toLocaleLowerCase('vi-VN') + s.slice(1) : '')
const ING_ERR_ORDER = ['trai_ghi_chu', 'bay', 'thieu_chinh', 'thieu_phu', 'thua']

// Một câu góp ý của Dì Sáu: lỗi nguyên liệu nặng nhất, không thì bước kém nhất, không thì khen.
export function dishComment(dish, recipe, data) {
  const INGS = (data && data.INGREDIENTS) || {}
  const ML = (data && data.METHOD_LABELS) || {}
  const nm = id => (INGS[id] && INGS[id].name) || id
  const errs = (dish.ingErrors || []).slice().sort((a, b) => ING_ERR_ORDER.indexOf(a.code) - ING_ERR_ORDER.indexOf(b.code))
  const e = errs[0]
  if (e) {
    if (e.code === 'trai_ghi_chu') {
      const note = ((recipe && recipe.notes) || []).find(n => (dish.notes || []).includes(n.id) && (n.removes || []).includes(e.ing))
      return `Phiếu dặn "${note ? note.label : 'ghi chú'}" mà con lại bỏ ${lowerFirst(nm(e.ing))} vô rồi.`
    }
    if (e.code === 'bay') {
      const real = INGS[e.ing] && INGS[e.ing].trapOf
      return real ? `${nm(e.ing)} đâu phải ${lowerFirst(nm(real))}! Coi kỹ kệ nha con.` : `Lấy nhầm ${lowerFirst(nm(e.ing))} rồi con.`
    }
    if (e.code === 'thieu_chinh' || e.code === 'thieu_phu') return `Thiếu ${lowerFirst(nm(e.ing))} rồi con ơi.`
    if (e.code === 'thua') return `Dư ${lowerFirst(nm(e.ing))} rồi, tốn tiền nguyên liệu đó con.`
  }
  const defs = (recipe && recipe.steps) || []
  let worst = null
  for (const id of Object.keys(dish.steps || {})) {
    const r = dish.steps[id]
    const def = defs.find(d => d.id === id)
    if (!def || !r || r.score >= 90) continue
    const w = def.w || 1
    if (!worst || r.score < worst.r.score || (r.score === worst.r.score && w > worst.w)) worst = { id, r, def, w }
  }
  if (worst) {
    const { r, def } = worst
    const label = def.label || ''
    if (r.skipped || r.tag === 'bo_qua') return `Con quên ${lowerFirst(label)} rồi kìa.`
    // lời nhắc theo lớp vỏ của bước (chảo: cháy; phin: đắng gắt; nồi: nhũn)
    if (r.tag === 'chay') return `${label} ${skinFor(def, data).overTip || 'bị cháy rồi, nhấc sớm chút nha con.'}`
    if (r.tag === 'song') return `${label} còn sống quá, đợi kim vô vùng xanh nha.`
    if (r.tag === 'tran') return 'Rót tràn rồi, gần vạch thì rót chậm lại nha con.'
    if (r.tag === 'sai_cach' && def.method) {
      return `${def.ing ? nm(def.ing) : 'Món này'} phải ${lowerFirst(ML[def.method.correct] || def.method.correct)} mới đúng nghen.`
    }
    const byType = {
      chon: 'Chọn nguyên liệu còn chạm nhầm, nhìn kỹ thẻ công thức nha.',
      cha: `${label} chưa kỹ, vuốt đều lên từng chỗ nha con.`,
      thai: `${label}: kéo dao trúng vạch chấm rồi hẵng nhấc tay nha.`,
      cham: `${label} chưa đúng, đếm kỹ số lần nha con.`,
      lua: `${label} chưa tới độ, canh kim vô giữa vùng xanh nha.`,
      rot: `${label} lệch vạch rồi, thả tay đúng vạch nha con.`
    }
    return byType[def.type] || `${label} còn chưa khéo, lần sau kỹ hơn nha.`
  }
  const praise = (data && data.DIALOGUE && data.DIALOGUE.diSau && data.DIALOGUE.diSau.praise) || ['Khéo tay lắm con!']
  return praise[Math.abs(Math.round(Number(dish.q) || 0)) % praise.length]
}

// Nạp css/kitchen.css một lần (khung app có thể đã gắn sẵn).
function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.querySelector('link[data-kitchen-css], link[href$="css/kitchen.css"]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = new URL('../../../css/kitchen.css', import.meta.url).href
  link.dataset.kitchenCss = '1'
  document.head.appendChild(link)
}

// Nấu thử: nới giới hạn thời gian của bước (2,5 × par → 10 × par) để người chơi làm thong thả.
export const TASTING_PAR_MUL = 4

export function mountKitchen(root, app, opts = {}) {
  ensureStyles()
  const tasting = opts && opts.tasting ? opts.tasting : null
  const main = h('div', { class: 'k-main' })
  const layer = h('div', { class: 'k-layer', hidden: true })
  const flashHost = h('div', { class: 'k-flash-host', 'aria-live': 'polite' })
  const el = h('section', { class: ['kitchen', tasting ? 'is-tasting' : ''], 'data-testid': 'kitchen', 'aria-label': tasting ? 'Nấu thử' : 'Bếp' }, main, flashHost, layer)
  root.appendChild(el)

  const ui = {
    visible: true,
    showRail: false,       // đang nấu (chọn hoặc thớt) nhưng người chơi quay về dây phiếu
    // (rổ đang chọn dở nằm trong state: cook.chonDraft, core/kitchen.js saveChonDraft — tải lại trang vẫn còn)
    openTicket: null,      // phiếu đang mở danh sách dòng
    play: null,            // {kind:'chon'|'step', handle, token, stepId}
    token: 0,
    lastDish: null,        // {ticketId, lineIndex, dish, comment, mood, recipeId}
    dismissed: null,       // bước dở người chơi chọn "Để sau" (không tự mở lại)
    layerKind: null,
    revealTimer: 0,
    key: ''
  }
  let destroyed = false
  const offs = []

  // Chặn "click ma" (màn cảm ứng): lớp phủ đóng/mở ngay lúc ngón tay còn chạm — Nhấc của bước lửa chốt ở pointerdown, chạm
  // thẻ gợi ý hay bảng công bố món, mini-game tự kết thúc (hết giờ, đủ lần chạm) — thì cú click trình duyệt sinh ra lúc nhấc
  // ngón rơi xuống phần tử mới nằm dưới ngón: nút "Bỏ món" trên Thớt, "Giao cho khách" trên dây phiếu, nút Xong của mini-game
  // vừa mở (bước về 0 điểm). Bỏ click của lần chạm bắt đầu TRƯỚC lần đổi lớp phủ gần nhất (so thứ tự sự kiện, không so giờ)
  // và chưa quá TAP_GUARD_MS; lần chạm mới và click từ bàn phím (có phím bấm sau lần chạm cuối) không bị chặn.
  const tapGuard = { seq: 0, press: 0, pressAt: 0, layer: 0 }
  const markLayer = () => { tapGuard.layer = ++tapGuard.seq }
  el.addEventListener('pointerdown', () => { tapGuard.press = ++tapGuard.seq; tapGuard.pressAt = performance.now() }, true)
  el.addEventListener('keydown', () => { tapGuard.press = 0 }, true)
  el.addEventListener('click', e => {
    const g = tapGuard
    if (g.press > 0 && g.press < g.layer && performance.now() - g.pressAt < TAP_GUARD_MS) { e.preventDefault(); e.stopPropagation() }
  }, true)

  // ---------- tiện ích ----------
  const S = () => app.state
  const SH = () => (app.state && app.state.shift) || null
  const D = () => app.data || {}
  const cctx = () => {
    const c = app.ctx || {}
    if (c.data) return c
    return { emit: (t, p) => { if (app.bus) app.bus.emit(t, p) }, data: app.data }
  }
  const recipeOf = id => (D().RECIPES || {})[id]
  const ingName = id => ((D().INGREDIENTS || {})[id] || {}).name || id
  const ingIconSvg = id => icon(((D().INGREDIENTS || {})[id] || {}).icon || id)
  const noteLabels = (recipe, notes) => (notes || []).map(id => ((recipe && recipe.notes) || []).find(n => n.id === id)).filter(Boolean).map(n => n.label)
  const gradeLabel = g => ((D().BALANCE && D().BALANCE.gradeLabels) || (D().STRINGS && D().STRINGS.grades) || {})[g] || g
  const save = () => { try { app.save && app.save() } catch (err) { console.error(err) } }
  const saveNow = () => {
    try { if (typeof app.saveNow === 'function') app.saveNow(); else save() } catch (err) { console.error(err) }
  }
  const toast = text => { try { app.toast && app.toast(text) } catch { /* bỏ qua */ } }
  const sound = n => { try { app.sound && app.sound(n) } catch { /* bỏ qua */ } }
  const vibrate = ms => { try { app.vibrate && app.vibrate(ms) } catch { /* bỏ qua */ } }
  const reduced = () => !!(S() && S().settings && S().settings.reducedMotion) ||
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const cookKey = c => (c ? `${c.ticketId}:${c.lineIndex}` : '')
  const playable = step => (tasting && step ? { ...step, par: (Number(step.par) || 1) * TASTING_PAR_MUL } : step)
  const tutorialLine = key => {
    if (tasting) return null
    const sh = SH()
    const t = D().DIALOGUE && D().DIALOGUE.diSau && D().DIALOGUE.diSau.tutorial
    return sh && sh.day === 1 && t && t[key] ? t[key] : null
  }

  function mode() {
    const sh = SH()
    if (!sh) return 'off'
    const c = sh.cook
    if (c && c.phase === 'chon' && !ui.showRail) return 'chon'
    if (c && c.phase === 'thot' && !ui.showRail) return 'thot'
    return 'rail'
  }

  function computeKey() {
    const sh = SH()
    const m = mode()
    if (m === 'off') return 'off'
    const c = sh.cook
    if (m === 'chon') return 'chon:' + cookKey(c)
    if (m === 'thot') {
      const st = Object.keys(c.steps || {}).map(k => k + '=' + c.steps[k].score + (c.steps[k].auto ? 'a' : '')).join(',')
      return `thot:${cookKey(c)}:${st}:${c.retryPending || ''}:${c.retriesLeft}`
    }
    // dòng phiếu cũng vào khóa: tình huống "khách đổi ý" (M3) sửa món của phiếu còn chờ
    const t = sh.tickets.map(x => [x.id, x.status, (x.done || []).map(Boolean).join(''),
      x.lines.map(l => `${l.recipeId}*${l.qty}:${(l.notes || []).join(',')}`).join(';')].join('/')).join('|')
    return `rail:${t}:${c ? cookKey(c) + c.phase : ''}:${ui.openTicket || ''}:${ui.lastDish ? cookKey(ui.lastDish) : ''}`
  }

  // ---------- dựng giao diện ----------
  function render() {
    if (destroyed) return
    ui.key = computeKey()
    if (ui.play && ui.play.kind === 'chon') stopPlay()
    clear(main)
    const m = mode()
    main.dataset.view = m
    if (m === 'off') {
      main.appendChild(h('div', { class: 'k-empty' }, 'Chưa mở ca. Mở hàng rồi mới nấu được nha.'))
      return
    }
    if (m === 'chon') renderChon()
    else if (m === 'thot') renderBoard()
    else renderRail()
    updateWaitColors()
  }

  function diSauLine(text, mood = 'vui') {
    if (!text) return null
    return h('div', { class: 'k-disau', 'data-testid': 'disau-line' },
      svgBox(DI_SAU[mood] || DI_SAU.vui, 'k-disau-face'), h('div', { class: 'k-bubble' }, text))
  }

  // Thẻ công thức: tên món, nguyên liệu cần (không lộ bẫy), ghi chú đỏ, các bước + trạng thái.
  // compact (trên Thớt sơ chế): chỉ hiện ghi chú đỏ, nguyên liệu và các bước gập lại để thớt đủ chỗ.
  function recipeCard(cook, open = false, compact = false) {
    const recipe = recipeOf(cook.recipeId) || {}
    const notes = noteLabels(recipe, cook.notes)
    const ings = (recipe.ingredients || []).map(i => {
      // "×2" là số lượng trong món, lấy 1 lần chạm (chạm lần nữa là bỏ ra) → ghi rõ để người mới không chạm 2 lần
      let text = ingName(i.id) + (i.qty && i.qty > 1 ? ` ×${i.qty} (chạm 1 lần)` : '')
      if (i.role === 'tuy_chon') {
        const by = (recipe.notes || []).filter(n => (n.adds || []).includes(i.id)).map(n => n.label)
        text += by.length ? ` (khi dặn ${by.join(', ')})` : ' (tùy chọn)'
      }
      // M4: nguyên liệu hiếm: số phần kho còn (luôn thấy trên thẻ, kể cả khi ô kệ có nhãn "còn n" nằm dưới thanh Xong;
      // nấu thử không trừ kho nên không ghi)
      const INGS = D().INGREDIENTS || {}
      const left = !tasting && INGS[i.id] && INGS[i.id].rare
        ? h('small', { class: 'k-card-left', 'data-testid': 'card-left-' + i.id }, ` · kho còn ${rareStock(S(), i.id)}`) : null
      return h('li', { class: ['k-card-ing', 'role-' + i.role] }, svgBox(ingIconSvg(i.id), 'k-card-ing-icon'), h('span', null, text, left))
    })
    const board = cook.board || effectiveSteps(recipe, cook.notes, null, cook.qty).filter(s => s.type !== 'chon')
    const steps = [{ id: 'chon', label: 'Chọn nguyên liệu' }, ...board].map(s => {
      const r = cook.steps && cook.steps[s.id]
      return h('li', { class: ['k-card-step', r ? 'is-done' : ''] },
        h('span', null, s.label), h('span', { class: 'k-card-step-st' }, r ? `${r.grade}${r.auto ? ' (tự làm)' : ''}` : '—'))
    })
    const noteRow = notes.length ? h('div', { class: 'k-notes k-card-notes' }, h('span', { class: 'k-card-lbl' }, 'Ghi chú:'), notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null
    if (compact) {
      const more = h('details', { class: 'k-card-steps' }, h('summary', null, `Thẻ công thức: nguyên liệu, ${steps.length} bước`),
        h('ul', { class: 'k-card-ings' }, ings), h('ol', null, steps))
      if (open) more.open = true
      return h('aside', { class: 'k-card is-compact', 'data-testid': 'recipe-card', 'aria-label': 'Thẻ công thức ' + (recipe.name || '') }, noteRow, more)
    }
    const details = h('details', { class: 'k-card-steps' }, h('summary', null, `Các bước (${steps.length})`), h('ol', null, steps))
    if (open) details.open = true
    return h('aside', { class: 'k-card', 'data-testid': 'recipe-card', 'aria-label': 'Thẻ công thức ' + (recipe.name || '') },
      noteRow,
      h('ul', { class: 'k-card-ings' }, ings),
      details)
  }

  // ----- Dây phiếu -----
  function renderRail() {
    const sh = SH()
    if (tasting) {
      // nấu thử: không có dây phiếu; Ra món xong màn Nấu thử tự hiện kết quả
      if (ui.lastDish) main.appendChild(lastDishBanner())
      else main.appendChild(h('div', { class: 'k-empty' }, 'Đang dọn thớt…'))
      return
    }
    const max = (D().BALANCE && D().BALANCE.ticketRailMax) || 3
    const head = h('div', { class: 'k-rail-head' }, h('h2', null, 'Dây phiếu'), h('span', { class: 'k-rail-count' }, `${sh.tickets.length}/${max}`))
    main.appendChild(head)
    if (ui.lastDish) main.appendChild(lastDishBanner())
    const c = sh.cook
    if (c && c.phase !== 'xong') {
      const r = recipeOf(c.recipeId)
      main.appendChild(h('div', { class: 'k-resume' },
        h('span', { class: 'k-resume-name' }, `Đang làm: ${r ? r.name : c.recipeId}`),
        h('button', { class: 'btn btn-ghost btn-small', type: 'button', 'data-testid': 'abandon-dish', onclick: () => onAbandon() }, 'Bỏ món'),
        h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'cook-resume', onclick: () => { ui.showRail = false; render() } }, 'Làm tiếp')))
    }
    if (!sh.tickets.length) {
      main.appendChild(h('div', { class: 'k-empty', 'data-testid': 'rail-empty' }, 'Chưa có phiếu nào. Qua Quầy nhận order nha!'))
      return
    }
    const list = h('div', { class: 'k-tickets' })
    for (const t of sh.tickets) list.appendChild(ticketCard(t))
    main.appendChild(list)
    if (sh.tickets.some(t => t.status === 'xong')) {
      const line = diSauLine(tutorialLine('serve'))
      if (line) main.appendChild(line)
    }
  }

  function ticketCard(t) {
    const sh = SH()
    const cust = sh.customers[t.customerId]
    const open = ui.openTicket === t.id
    const c = sh.cook
    const lines = t.lines.map((l, i) => {
      const r = recipeOf(l.recipeId)
      const notes = noteLabels(r, l.notes)
      const done = t.done && t.done[i]
      const cooking = c && c.phase !== 'xong' && c.ticketId === t.id && c.lineIndex === i
      const status = done ? gradeLabel(done.grade) : cooking ? 'Đang làm' : 'Chờ'
      const row = h('div', { class: ['k-line', done ? 'is-done' : '', cooking ? 'is-cooking' : ''] },
        svgBox(icon(r ? r.icon : l.recipeId), 'k-line-icon'),
        h('div', { class: 'k-line-text' },
          h('div', { class: 'k-line-name' }, `${l.qty} × ${r ? r.name : l.recipeId}`),
          notes.length ? h('div', { class: 'k-notes' }, notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null),
        h('span', { class: ['k-line-st', done ? 'grade-' + done.grade : ''] }, status))
      if (open && !done) {
        row.appendChild(h('button', {
          class: 'btn btn-primary k-line-go', type: 'button', 'data-testid': 'cook-line-' + i,
          onclick: e => { e.stopPropagation(); openLine(t.id, i) }
        }, cooking ? 'Làm tiếp' : 'Làm món này'))
      }
      return row
    })
    const serve = t.status === 'xong'
      ? h('button', {
        class: 'btn btn-primary k-serve', type: 'button', 'data-testid': 'serve-ticket', dataset: { ticketId: t.id },
        onclick: e => { e.stopPropagation(); onServe(t.id) }
      }, 'Giao cho khách')
      : null
    const card = h('article', {
      class: ['k-ticket', open ? 'is-open' : '', t.remake ? 'is-remake' : '', serve ? 'is-ready' : ''],
      'data-testid': 'ticket-' + t.id, dataset: { ticketId: t.id, status: t.status, wait: 'green' },
      role: 'button', tabindex: '0', 'aria-expanded': open ? 'true' : 'false',
      onclick: () => { ui.openTicket = open ? null : t.id; render() },
      onkeydown: e => { if (e.key === 'Enter') { ui.openTicket = open ? null : t.id; render() } }
    },
    h('div', { class: 'k-ticket-head' },
      h('b', { class: 'k-ticket-no' }, t.no),
      h('span', { class: 'k-ticket-cust' }, cust ? cust.name : ''),
      t.remake ? h('span', { class: 'k-tag' }, 'Làm lại') : null,
      h('span', { class: 'k-wait-dot', 'aria-hidden': 'true' })),
    lines, serve)
    return card
  }

  function lastDishBanner() {
    const d = ui.lastDish
    return h('div', { class: ['k-last', 'grade-' + d.dish.grade], 'data-testid': 'dish-result', dataset: { grade: d.dish.grade, q: d.dish.q } },
      svgBox(DI_SAU[d.mood] || DI_SAU.vui, 'k-disau-face'),
      h('div', { class: 'k-last-text' },
        h('b', null, `${d.name}: ${gradeLabel(d.dish.grade)} · ${d.dish.q}%`),
        d.dish.flawless ? h('span', { class: 'k-flawless' }, 'Không tì vết') : null,
        h('div', { class: 'k-bubble' }, d.comment)))
  }

  // ----- Chọn nguyên liệu -----
  function renderChon() {
    const sh = SH()
    const cook = sh.cook
    const recipe = recipeOf(cook.recipeId)
    if (!recipe) { main.appendChild(h('div', { class: 'k-empty' }, 'Không tìm thấy công thức.')); return }
    if (!tasting) main.appendChild(boardHeader(cook))
    main.appendChild(recipeCard(cook))
    const stage = h('div', { class: 'mg-stage' })
    main.appendChild(h('div', { class: 'k-chon-wrap' }, stage))
    // bước chọn đã nhân par theo số lượng
    const step = effectiveSteps(recipe, cook.notes, null, cook.qty).find(s => s.type === 'chon') ||
      { id: 'chon', type: 'chon', label: 'Chọn nguyên liệu', par: 6, w: 1 }
    const rand = uiRand(hashKey([S().seed, sh.day, cook.ticketId, cook.lineIndex, 'shelf'].join(':')))
    const shelf = (recipe.shelf || []).slice()
    for (let i = shelf.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shelf[i], shelf[j]] = [shelf[j], shelf[i]] }
    // ngày 1: lời Dì Sáu nằm ngay trong rổ (đỡ tốn chỗ trên màn dọc)
    const tut = tutorialLine('chon')
    // rổ đang chọn dở (lưu trong state: về dây phiếu, đổi tab hay tải lại trang đều giữ, kể cả lần chọn nhầm); mở lại
    // dòng từng bỏ món giữa bước Chọn: rổ trống nhưng mang số lần nhầm cũ (startCook lấy từ ticket.chonMistakes, mục 25)
    const draft = chonDraft(S(), cctx())
    // M4: nguyên liệu hiếm trên kệ hiện "còn n" (số phần trong kho hàng hiếm; nấu thử không trừ kho nên không hiện)
    const INGS = D().INGREDIENTS || {}
    const stockLeft = {}
    if (!tasting) for (const id of shelf) if (INGS[id] && INGS[id].rare) stockLeft[id] = rareStock(S(), id)
    const handle = playStep(stage, playable(step), {
      ...pluginCtx(step, cook, recipe), shelf, basketHint: tut ? 'Dì Sáu: ' + tut : null, stockLeft,
      initial: draft && (draft.picked.length || draft.mistakes || draft.overtime) ? draft : null,
      // mỗi lần thêm/bớt nguyên liệu: lưu rổ vào save (debounce); chọn nhầm hay vừa quá giờ thì ghi ngay để tải lại trang
      // không xóa được lần nhầm, phạt quá giờ
      onChange: snap => {
        if (destroyed) return
        const r = saveChonDraft(S(), snap, cctx())
        if (!r.ok) return
        if (r.raised) saveNow()
        else save()
      }
    })
    const token = ++ui.token
    ui.play = { kind: 'chon', handle, token, stepId: 'chon' }
    handle.result.then(res => {
      if (!res || destroyed || !ui.play || ui.play.token !== token) return
      ui.play = null
      onChonResult(res)
    })
  }

  function onChonResult(res) {
    const r = submitChon(S(), res.details.picked, res.details.mistakes, cctx())
    if (!r.ok) {
      if (r.blockedMissingMain) toast('Còn thiếu nguyên liệu chính')
      // giữ rổ đã chọn (lưu vào state) để chọn tiếp
      const d = saveChonDraft(S(), {
        picked: res.details.picked, mistakes: res.details.tapMistakes ?? res.details.mistakes, overtime: res.details.overtime === true
      }, cctx())
      if (d.ok) save()
      render()
      return
    }
    // submitChon đã xóa rổ dở (cook.chonDraft)
    ui.showRail = false
    save()
    const cook = SH().cook
    const g = cook && cook.steps.chon ? cook.steps.chon.grade : ''
    flash(`Chọn nguyên liệu: ${g}`, r.score)
    render()
  }

  // ----- Thớt sơ chế -----
  // (Nấu thử không có dòng đầu này: màn Nấu thử đã có nhãn "Nấu thử" + tên món và nút về Chợ.)
  function boardHeader(cook) {
    const sh = SH()
    const t = sh.tickets.find(x => x.id === cook.ticketId)
    const recipe = recipeOf(cook.recipeId)
    return h('div', { class: 'k-board-head' },
      h('button', { class: 'btn btn-ghost k-back', type: 'button', 'data-testid': 'kitchen-back', 'aria-label': 'Về dây phiếu', onclick: () => { ui.showRail = true; render() } }, '‹ Phiếu'),
      recipe ? svgBox(icon(recipe.icon || recipe.id), 'k-card-icon') : null,
      h('span', { class: 'k-board-title' }, `${t ? t.no + ' · ' : ''}${recipe ? recipe.name : ''}`, cook.qty > 1 ? h('span', { class: 'k-qty' }, ` ×${cook.qty}`) : null),
      t ? h('span', { class: 'k-wait-dot', dataset: { ticketId: t.id, wait: 'green' }, 'data-wait-dot': t.id }) : null)
  }

  function renderBoard() {
    const sh = SH()
    const cook = sh.cook
    const ctx = cctx()
    const recipe = recipeOf(cook.recipeId) || {}
    const bs = boardSteps(S(), ctx)
    if (!tasting) main.appendChild(boardHeader(cook))
    main.appendChild(recipeCard(cook, false, true))

    // Nguyên liệu trên thớt, mỗi thứ kèm các bước của nó.
    const groups = new Map()
    for (const id of cook.picked || []) groups.set(id, [])
    const whole = []
    for (const s of bs) {
      if (s.ing && groups.has(s.ing)) groups.get(s.ing).push(s)
      else whole.push(s)
    }
    const boardEl = h('div', { class: 'k-board', 'data-testid': 'board' })
    const ready = []
    for (const [ing, steps] of groups) {
      if (steps.length) boardEl.appendChild(ingTile(ing, steps, bs))
      else ready.push(ing)
    }
    if (whole.length) boardEl.appendChild(ingTile(null, whole, bs, recipe))
    const readyRow = ready.length
      ? h('div', { class: 'k-ready', 'data-testid': 'board-ready' }, h('span', { class: 'k-card-lbl' }, 'Sẵn sàng:'),
        ready.map(id => h('span', { class: 'k-ready-item', dataset: { ing: id } }, svgBox(ingIconSvg(id), 'k-card-ing-icon'), ingName(id), ' ✓')))
      : null
    // lời Dì Sáu (ngày 1) nằm ngay dưới tên thớt, gọn một bong bóng nhỏ: đặt dưới thớt thì bị thanh "Bỏ món / Ra món"
    // che mất ở màn thấp, người mới không thấy lời giải thích duy nhất về Thớt sơ chế
    const tip = diSauLine(tutorialLine('thot'))
    if (tip) tip.classList.add('is-compact')
    main.appendChild(h('div', { class: 'k-thot' }, h('div', { class: 'k-thot-title' }, 'Thớt sơ chế'), tip, readyRow, boardEl))

    const retryInfo = cook.retriesLeft > 0 ? `Còn ${cook.retriesLeft} lượt làm lại` : 'Hết lượt làm lại'
    main.appendChild(h('div', { class: 'k-toolbar' },
      h('span', { class: 'k-retry-info' }, retryInfo),
      tasting ? null : h('button', { class: 'btn btn-danger', type: 'button', 'data-testid': 'abandon-dish', onclick: onAbandon }, 'Bỏ món'),
      h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'finish-dish', onclick: onFinish }, 'Ra món')))
  }

  function ingTile(ing, steps, all, recipe) {
    const doneTypes = new Set(steps.filter(s => s.done).map(s => s.type))
    const cls = ['k-ing']
    if (doneTypes.has('cha')) cls.push('is-washed')
    if (doneTypes.has('thai')) cls.push('is-cut')
    if (doneTypes.has('lua')) cls.push('is-cooked')
    if (steps.length && steps.every(s => s.done)) cls.push('is-finished')
    if (!steps.length) cls.push('is-ready')
    const name = ing ? ingName(ing) : 'Cả món'
    const img = ing ? ingIconSvg(ing) : icon((recipe && recipe.icon) || 'fallback')
    const byId = new Map(all.map(s => [s.id, s]))
    return h('div', { class: cls, dataset: { ing: ing || 'ca_mon' } },
      h('div', { class: 'k-ing-top' }, svgBox(img, 'k-ing-icon'), h('span', { class: 'k-ing-name' }, name),
        !steps.length ? h('span', { class: 'k-ing-ready' }, '✓ Sẵn sàng') : null),
      steps.length ? h('div', { class: 'k-steps' }, steps.map(s => stepButton(s, byId))) : null)
  }

  function stepButton(s, byId) {
    const r = s.result
    let st = ''
    const cls = ['k-step', 'type-' + s.type]
    if (r) {
      st = `${r.grade} · ${r.score}${r.auto ? ' (tự làm)' : ''}`
      cls.push('is-done', 'grade-' + gradeClass(r.score))
    } else if (!s.available) {
      const need = (s.after || []).filter(id => !(byId.get(id) && byId.get(id).done)).map(id => (byId.get(id) || {}).label || id)
      st = 'Sau: ' + need.join(', ')
      cls.push('is-locked')
    } else {
      st = s.method ? 'Chọn cách rồi làm' : 'Chạm để làm'
      cls.push('is-available')
    }
    if (s.critical) cls.push('is-critical')
    return h('button', {
      class: cls, type: 'button', 'data-testid': 'board-step-' + s.id, dataset: { stepId: s.id, type: s.type },
      'aria-disabled': !r && !s.available ? 'true' : 'false',
      onclick: () => onBoardStep(s.id)
    },
    h('span', { class: 'k-step-label' }, (!r && !s.available ? '🔒 ' : '') + s.label),
    h('span', { class: 'k-step-st' }, st))
  }

  function gradeClass(score) {
    if (score >= 90) return 'hoan_hao'
    if (score >= 70) return 'tot'
    if (score >= 50) return 'dat'
    return 'hong'
  }

  // ---------- thao tác ----------
  function openLine(ticketId, i) {
    const sh = SH()
    const cur = sh.cook
    const c = startCook(S(), ticketId, i, cctx())
    if (!c) {
      if (cur && cur.phase !== 'xong') toast('Làm xong hoặc bỏ món đang dở trước nha.')
      else toast('Không mở được dòng này.')
      return
    }
    ui.showRail = false
    ui.openTicket = null
    ui.lastDish = null
    ui.dismissed = null
    save()
    sound('paper')
    render()
  }

  function onBoardStep(stepId) {
    if (ui.play) return
    const ctx = cctx()
    const s = boardSteps(S(), ctx).find(x => x.id === stepId)
    if (!s) return
    if (s.done) {
      if (s.canRetry) openSheet(s)
      else toast(s.result && s.result.auto ? 'Bước tự làm không làm lại được.' : 'Bước này đã làm rồi.')
      return
    }
    if (!s.available) {
      toast('Cần làm bước trước đã.')
      return
    }
    if (s.method || s.canAuto) { openSheet(s); return }
    startStep(stepId, null)
  }

  // Bảng chọn trước khi làm: cách sơ chế / tự làm / làm lại.
  function openSheet(s, { retrying = false } = {}) {
    const METHOD = D().METHOD_LABELS || {}
    const cook = SH().cook
    const kids = [h('h3', { class: 'k-sheet-title' }, s.label)]
    if (s.done && !retrying) {
      const step = getStep(S(), s.id) || {}
      const cost = Math.max(0, Number(step.retryCost) || 0)
      kids.push(h('p', null, `Kết quả: ${s.result.grade} · ${s.result.score}. Làm lại thì điểm mới tối đa 85${cost ? `, tốn ${formatVND(cost)}` : ''}.`))
      kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'retry-step', onclick: () => onRetry(s.id) },
        cost ? `Làm lại (${formatVND(cost)})` : 'Làm lại'))
    } else {
      if (s.method) {
        kids.push(h('p', { class: 'k-sheet-q' }, 'Chọn cách sơ chế:'))
        kids.push(h('div', { class: 'k-methods' }, (s.method.options || []).map(id =>
          h('button', { class: 'btn k-method', type: 'button', 'data-testid': 'method-' + id, onclick: () => { closeLayer(); startStep(s.id, id) } },
            METHOD[id] || id))))
      } else {
        kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'step-start', onclick: () => { closeLayer(); startStep(s.id, null) } }, 'Tự tay làm'))
      }
      if (s.canAuto && !retrying) {
        const score = (D().BALANCE && D().BALANCE.autoStepScore) || 80
        kids.push(h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'auto-step', onclick: () => onAuto(s.id) }, `Tự làm (${score} điểm)`))
      }
    }
    kids.push(h('button', {
      class: 'btn btn-ghost k-sheet-close', type: 'button', 'data-testid': 'sheet-close',
      onclick: () => { if (cook && cook.activeStepId === s.id) ui.dismissed = s.id; closeLayer() }
    }, 'Để sau'))
    showLayer('sheet', h('div', { class: 'k-sheet', 'data-testid': 'step-sheet', role: 'dialog' }, kids))
  }

  function onAuto(stepId) {
    closeLayer()
    const r = autoStep(S(), stepId, cctx())
    if (!r.ok) { toast('Chưa tự làm được bước này.'); return }
    save()
    flash(`Tự làm: ${r.grade}`, r.score)
    render()
  }

  function onRetry(stepId) {
    closeLayer()
    const r = retryStep(S(), stepId, cctx())
    if (!r.ok) { toast(r.reason === 'het_luot' ? 'Hết lượt làm lại rồi.' : 'Không làm lại được bước này.'); render(); return }
    save()
    render()
    const step = getStep(S(), stepId)
    if (step && step.method) {
      const s = boardSteps(S(), cctx()).find(x => x.id === stepId)
      if (s) { openSheet(s, { retrying: true }); return }
    }
    startStep(stepId, null)
  }

  function pluginCtx(step, cook, recipe) {
    const st = S()
    const sh = SH()
    const d = D()
    return {
      app, recipe, data: d, notes: cook.notes.slice(), qty: cook.qty,
      zoneMul: zoneMul(st, step.type, cook.recipeId, d.BALANCE, d.UPGRADES),
      assist: !!(st.settings && st.settings.assistMotion),
      // Nấu thử: không tính giờ thật sự (không tự kết thúc bước, không phạt quá giờ) và có "tay chỉ" (gợi ý ngay)
      untimed: !!tasting, guide: !!tasting,
      slowBurn: !!(st.upgrades && st.upgrades.chao_chong_dinh),
      rand: uiRand(hashKey([st.seed, sh.day, cook.ticketId, cook.lineIndex, step.id].join(':')))
    }
  }

  // Chơi một bước trên thớt: thẻ gợi ý 0,8 giây (chạm để bỏ qua) rồi mount mini-game phủ panel.
  function startStep(stepId, method) {
    const step = beginStep(S(), stepId)
    if (!step) { toast('Bước này chưa mở.'); render(); return }
    ui.dismissed = null
    save()
    const sh = SH()
    const cook = sh.cook
    const recipe = recipeOf(cook.recipeId)
    const notes = noteLabels(recipe, cook.notes)
    const stage = h('div', { class: 'mg-stage' })
    // data-type: loại mini-game (CSS gọn đầu sân khấu riêng cho bước Chà ở màn thấp — css/kitchen.css)
    const wrap = h('div', { class: 'k-stage-wrap', dataset: { type: step.type } },
      h('div', { class: 'k-stage-bar' },
        h('span', { class: 'k-stage-dish' }, recipe ? recipe.name : ''),
        method ? h('span', { class: 'k-stage-method' }, (D().METHOD_LABELS || {})[method] || method) : null,
        notes.length ? h('span', { class: 'k-notes' }, notes.map(n => h('span', { class: 'k-note' }, upper(n)))) : null),
      stage)
    showLayer('stage', wrap)
    const token = ++ui.token
    ui.play = { kind: 'step', handle: null, token, stepId }

    const go = () => {
      if (destroyed || !ui.play || ui.play.token !== token) return
      hintEl && hintEl.remove()
      const handle = playStep(stage, playable(step), pluginCtx(step, cook, recipe))
      markLayer()   // thẻ gợi ý vừa nhường chỗ cho mini-game (nút Xong có thể nằm ngay dưới ngón tay)
      revealTargets(stage)
      ui.play.handle = handle
      handle.result.then(res => {
        if (!res || destroyed || !ui.play || ui.play.token !== token) return
        ui.play = null
        onStepResult(step, method, res)
      })
    }
    const prog = S().recipes && S().recipes[cook.recipeId]
    const showHint = !prog || (prog.cooks || 0) < HINT_HIDE_AFTER_COOKS
    let hintEl = null
    if (showHint) {
      const hint = hintFor(step, D())
      hintEl = h('div', { class: 'k-hint', 'data-testid': 'step-hint', role: 'status' },
        h('b', null, step.label), h('span', null, hint.text), h('small', null, 'Chạm để bắt đầu ngay'))
      let started = false
      const once = () => { if (started) return; started = true; go() }
      hintEl.addEventListener('pointerdown', e => { e.preventDefault(); once() })
      wrap.appendChild(hintEl)
      setTimeout(once, HINT_MS)
    } else {
      requestAnimationFrame(go)
    }
  }

  function onStepResult(step, method, res) {
    const r = submitStep(S(), step.id, { score: res.score, method: method || undefined, details: res.details }, cctx())
    closeLayer()
    if (!r.ok) { toast('Không lưu được bước này.'); render(); return }
    save()
    const good = r.score >= 90
    sound(good ? 'ding' : r.score < 50 ? 'error' : 'click')
    vibrate(r.score < 50 ? 80 : 15)
    const extra = r.methodWrong ? ' (sai cách −15)' : ''
    flash(`${step.label}: ${r.grade}${extra}`, r.score)
    render()
    if (step.critical && r.score < 50) criticalPrompt(step)
  }

  // Bước chí mạng Hỏng: Làm lại (tốn tiền) / Bỏ món / Để vậy.
  function criticalPrompt(step) {
    const s = boardSteps(S(), cctx()).find(x => x.id === step.id)
    const cost = Math.max(0, Number(step.retryCost) || 0)
    const kids = [
      svgBox(DI_SAU.lo, 'k-disau-face'),
      h('h3', { class: 'k-sheet-title' }, `${step.label} hỏng rồi!`),
      h('p', null, 'Món sẽ bị tính Hỏng nếu để vậy.')
    ]
    if (s && s.canRetry) {
      kids.push(h('button', { class: 'btn btn-primary', type: 'button', 'data-testid': 'retry-step', onclick: () => onRetry(step.id) },
        cost ? `Làm lại (tốn ${formatVND(cost)})` : 'Làm lại'))
    }
    kids.push(h('button', { class: 'btn btn-danger', type: 'button', 'data-testid': 'abandon-dish', onclick: () => { closeLayer(); onAbandon(true) } }, 'Bỏ món'))
    kids.push(h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'prompt-close', onclick: closeLayer }, 'Để vậy'))
    showLayer('prompt', h('div', { class: 'k-sheet k-critical', 'data-testid': 'critical-prompt', role: 'dialog' }, kids))
  }

  async function confirmBox({ title, text, ok, cancel = 'Quay lại', danger = false }) {
    if (typeof app.modal === 'function') {
      try {
        const v = await app.modal({
          title, text,
          actions: [
            { label: cancel, value: false, kind: 'ghost', testid: 'confirm-cancel' },
            { label: ok, value: true, kind: danger ? 'danger' : 'primary', testid: 'confirm-ok' }
          ]
        })
        return v === true
      } catch { /* dùng hộp dự phòng */ }
    }
    return new Promise(resolve => {
      const done = v => { closeLayer(); resolve(v) }
      showLayer('confirm', h('div', { class: 'k-sheet', 'data-testid': 'confirm', role: 'dialog' },
        h('h3', { class: 'k-sheet-title' }, title), h('p', null, text),
        h('button', { class: danger ? 'btn btn-danger' : 'btn btn-primary', type: 'button', 'data-testid': 'confirm-ok', onclick: () => done(true) }, ok),
        h('button', { class: 'btn btn-ghost', type: 'button', 'data-testid': 'confirm-cancel', onclick: () => done(false) }, cancel)))
    })
  }

  async function onFinish() {
    if (ui.play && ui.play.kind === 'step') return
    const ctx = cctx()
    const undone = boardSteps(S(), ctx).filter(s => !s.done)
    if (undone.length) {
      const ok = await confirmBox({
        title: 'Ra món luôn?',
        text: `Còn ${undone.length} bước chưa làm, mỗi bước tính 0 điểm.`,
        ok: 'Vẫn ra món', cancel: 'Làm tiếp'
      })
      if (!ok || destroyed) return
    }
    const sh = SH()
    const cook = sh && sh.cook
    if (!cook || cook.phase !== 'thot') return
    const recipe = recipeOf(cook.recipeId)
    const dish = finishDish(S(), ctx)
    if (!dish) { toast('Chưa ra món được.'); return }
    save()
    const mood = moodForGrade(dish.grade)
    ui.lastDish = {
      ticketId: cook.ticketId, lineIndex: cook.lineIndex, recipeId: cook.recipeId,
      name: recipe ? recipe.name : cook.recipeId, dish, mood, comment: dishComment(dish, recipe, D())
    }
    ui.showRail = false
    ui.openTicket = null
    render()
    showReveal()
    if (tasting && typeof tasting.onDone === 'function') {
      setTimeout(() => { if (!destroyed) tasting.onDone(dish) }, REVEAL_MS + 150)
    }
  }

  function showReveal() {
    const d = ui.lastDish
    if (!d) return
    clear(flashHost)
    const recipe = recipeOf(d.recipeId) || {}
    const lvUp = d.dish.mastery && d.dish.mastery.levelUp
    const lvNames = (D().STRINGS && D().STRINGS.masteryLevels) || {}
    const box = h('div', {
      class: ['k-reveal', 'grade-' + d.dish.grade], 'data-testid': 'dish-reveal',
      dataset: { grade: d.dish.grade, q: d.dish.q }, role: 'status'
    },
    svgBox(icon(recipe.icon || d.recipeId), 'k-reveal-dish'),
    h('div', { class: 'k-reveal-grade' }, gradeLabel(d.dish.grade)),
    h('div', { class: 'k-reveal-q' }, `${d.dish.q}%`),
    d.dish.flawless ? h('div', { class: 'k-flawless' }, 'Không tì vết') : null,
    lvUp ? h('div', { class: 'k-levelup' }, `Lên cấp thạo món: ${lvNames[d.dish.mastery.levelAfter] || d.dish.mastery.levelAfter}`) : null,
    h('div', { class: 'k-disau' }, svgBox(DI_SAU[d.mood] || DI_SAU.vui, 'k-disau-face'), h('div', { class: 'k-bubble' }, d.comment)))
    showLayer('reveal', box)
    box.addEventListener('pointerdown', () => closeLayer())
    sound(d.dish.grade === 'hong' ? 'error' : 'bell')
    vibrate(d.dish.grade === 'hong' ? 80 : 15)
    clearTimeout(ui.revealTimer)
    ui.revealTimer = setTimeout(() => { if (ui.layerKind === 'reveal') closeLayer() }, REVEAL_MS)
  }

  async function onAbandon(skipConfirm = false) {
    const cook = SH() && SH().cook
    if (!cook || cook.phase === 'xong') return
    if (skipConfirm !== true) {
      const cost = cook.cost ? cook.cost.cogs + cook.cost.waste : 0
      const ok = await confirmBox({
        title: 'Bỏ món này?',
        text: cost ? `Nguyên liệu đã lấy (${formatVND(cost)}) thành hao hụt, phiếu quay lại dây.` : 'Phiếu quay lại dây, khách vẫn đang chờ.',
        ok: 'Bỏ món', cancel: 'Làm tiếp', danger: true
      })
      if (!ok || destroyed) return
    }
    stopPlay()
    // bỏ món: phiên nấu (kèm rổ dở cook.chonDraft) bị xóa; số lần chọn nhầm của dòng (giữa bước Chọn hay đã chốt, bỏ trên
    // Thớt) được ghi lại vào phiếu (ticket.chonMistakes) nên mở lại dòng này không về 0
    const r = abandonDish(S(), cctx())
    if (!r.ok) return
    save()
    ui.showRail = false
    toast(r.waste ? `Đã bỏ món, hao hụt ${formatVND(r.waste)}` : 'Đã bỏ món')
    render()
  }

  function onServe(ticketId) {
    const sh = SH()
    const t = sh && sh.tickets.find(x => x.id === ticketId)
    if (!t) return
    const customerId = t.customerId
    const sheet = serveTicket(S(), ticketId, cctx())
    if (!sheet) { toast('Phiếu chưa xong hết món.'); return }
    save()
    sound('bell')
    if (ui.lastDish && ui.lastDish.ticketId === ticketId) ui.lastDish = null
    try { app.bus && app.bus.emit('kitchen.served', { ticketId, customerId, sheet }) } catch (err) { console.error(err) }
    render()
  }

  // Màn thấp (360×600–640 trong ca thật, ca đông khách): nội dung sân khấu cao hơn panel nên sân khấu cuộn, thanh chân dính
  // đáy. Mở bước thì cuộn sẵn vừa đủ để mọi mục tiêu rời (vết bẩn của bước Chà, chai của bước Nêm) nằm trọn phía trên thanh
  // chân, không phải tự vuốt tìm; không đẩy mục tiêu cao nhất khuất đầu sân khấu. Chỉ cuộn: vị trí, kích thước mục tiêu và
  // cách chơi giữ nguyên (đầu sân khấu — tên món, hướng dẫn — có thể khuất một phần, vuốt xuống để xem lại).
  function revealTargets(stage) {
    try {
      const foot = stage.querySelector(':scope > .mg-foot')
      const targets = stage.querySelectorAll('.cha-spot, .cham-bottle')
      if (!foot || !targets.length || stage.scrollHeight <= stage.clientHeight + 1) return
      const footTop = foot.getBoundingClientRect().top
      const stageTop = stage.getBoundingClientRect().top
      let lo = Infinity
      let hi = -Infinity
      for (const t of targets) {
        const r = t.getBoundingClientRect()
        lo = Math.min(lo, r.top)
        hi = Math.max(hi, r.bottom)
      }
      const need = Math.ceil(hi + 4 - footTop)
      const room = Math.floor(lo - 4 - stageTop)
      if (need > 0 && room > 0) stage.scrollTop += Math.min(need, room)
    } catch (err) { console.error(err) }
  }

  // ---------- lớp phủ ----------
  function showLayer(kind, node) {
    clearTimeout(ui.revealTimer)
    markLayer()
    if (kind !== 'stage') clear(flashHost)   // nhãn nổi không che hộp thoại
    clear(layer)
    layer.appendChild(node)
    layer.hidden = false
    layer.dataset.kind = kind
    ui.layerKind = kind
  }

  function closeLayer() {
    clearTimeout(ui.revealTimer)
    markLayer()
    if (ui.play && ui.play.kind === 'step') stopPlay()
    clear(layer)
    layer.hidden = true
    delete layer.dataset.kind
    ui.layerKind = null
  }

  function stopPlay() {
    const p = ui.play
    ui.play = null
    // giữ rổ đang chọn dở (về dây phiếu, đổi tab) để mở lại không phải chọn từ đầu (mỗi lần chạm đã lưu, đây là chốt cuối)
    if (p && p.kind === 'chon' && p.handle && typeof p.handle.snapshot === 'function') {
      try { saveChonDraft(S(), p.handle.snapshot(), cctx()) } catch (err) { console.error(err) }
    }
    if (p && p.handle) { try { p.handle.destroy() } catch (err) { console.error(err) } }
  }

  // Nhãn kết quả nổi (không bắt chờ).
  function flash(text, score) {
    const g = gradeClass(score)
    const n = h('div', { class: ['k-flash', 'grade-' + g], 'data-testid': 'step-result', dataset: { score } }, text, h('b', null, ` ${score}`))
    flashHost.appendChild(n)
    setTimeout(() => n.remove(), reduced() ? 1200 : 1600)
  }

  function updateWaitColors() {
    const sh = SH()
    if (!sh) return
    for (const t of sh.tickets) {
      const lv = t.status === 'xong' ? 'green' : waitLevel(waitRatio(sh, t))
      const nodes = el.querySelectorAll(`[data-ticket-id="${t.id}"]`)
      for (const n of nodes) if (n.dataset.wait !== lv && n.dataset.wait !== undefined) n.dataset.wait = lv
    }
  }

  // Bước đang dở (tải lại / chuyển tab) → chơi lại từ đầu.
  function resumeActive() {
    const sh = SH()
    const cook = sh && sh.cook
    if (!cook || cook.phase !== 'thot' || !cook.activeStepId || ui.play || ui.layerKind) return
    if (ui.showRail || ui.dismissed === cook.activeStepId) return
    const s = boardSteps(S(), cctx()).find(x => x.id === cook.activeStepId)
    if (!s || s.done) return
    if (s.method) openSheet(s, { retrying: true })
    else startStep(s.id, null)
  }

  // ---------- vòng đời ----------
  function update() {
    if (destroyed || !ui.visible) return
    const k = computeKey()
    if (k !== ui.key) render()
    updateWaitColors()
    el.classList.toggle('is-reduced', reduced())
  }

  function onShow() {
    ui.visible = true
    render()
    resumeActive()
  }

  function onHide() {
    ui.visible = false
    stopPlay()
    closeLayer()
  }

  function selectTicket(ticketId) {
    ui.openTicket = ticketId
    const c = SH() && SH().cook
    // đang nấu dở: hiện dây phiếu (món dở vẫn giữ, bấm "Làm tiếp" để quay lại)
    if (c && c.phase !== 'xong' && !(ui.play && ui.play.kind === 'step')) ui.showRail = true
    if (ui.visible && !(ui.play && ui.play.kind === 'step')) render()
  }

  function unmount() {
    destroyed = true
    for (const off of offs) { try { off() } catch { /* bỏ qua */ } }
    stopPlay()
    clearTimeout(ui.revealTimer)
    el.remove()
  }

  // Dây phiếu chung của màn ca bán: chạm phiếu → mở phiếu đó trong bếp.
  if (app.bus && typeof app.bus.on === 'function') {
    const off = app.bus.on('ui.ticket.select', ({ ticketId } = {}) => { if (ticketId) selectTicket(ticketId) })
    if (typeof off === 'function') offs.push(off)
  }

  // Panel có thể đang ẩn lúc mount (tab Quầy): chỉ dựng mini-game khi panel hiện ra (cần kích thước thật).
  ui.visible = el.getClientRects().length > 0
  if (ui.visible) {
    render()
    resumeActive()
  }
  return { unmount, update, onShow, onHide, selectTicket }
}

// Theo quy ước router (mục 13): export default { mount(root, app, params) }.
export default {
  mount(root, app, params = {}) {
    const k = mountKitchen(root, app)
    if (params && params.ticketId) k.selectTicket(params.ticketId)
    return k
  }
}
