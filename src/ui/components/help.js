// Nút "?" (Hướng dẫn) và bảng Hướng dẫn: xem lại hướng dẫn màn này, trang Cách chơi, xem lại tất cả hướng dẫn từ đầu
// (xác nhận ngay trong bảng, không dùng confirm()). Nút có ở HUD ca bán, đầu màn Chuẩn bị, Tổng kết và các màn con có tour.
// Bảng mở bằng hộp thoại chung (app.modal, lớp nổi gốc: không bị thanh tab che trên iPhone), chặn thời gian ca như mọi hộp
// thoại chặn; trong ca còn "giữ" màn ca bán (app.tour.hold): bước mini-game đang chơi dở sẽ chơi lại từ đầu như khi đổi tab.
// M5 Đợt 3 (gói M-E, bản 0.5.2): bảng kiểu game — Dì Sáu bán thân + bong bóng lời, ba lựa chọn là ô giấy có hình to (vẽ ở
// HELP_ART theo quy chuẩn mục 6.1); trang Cách chơi là các thẻ giấy có hình: dải 4 khâu (biểu tượng khâu của scene.js
// Đợt 2), lưới thao tác bếp (dụng cụ của art.js), sao + xu tip, sự kiện, hàng hiếm. Giữ testid help-button, help-sheet,
// help-replay (chữ là tên tour của màn), help-how, how-to-play (chữ "Order … Thanh toán … Tính tiền … Làm đồ"),
// how-card-<id> (đúng HOW_TO_PLAY.length thẻ), help-reset*, help-back, help-close. Import trong Node an toàn.
import { h, svgBox } from '../dom.js'
import { DI_SAU, DI_SAU_POSES, icon } from '../art.js'
import { SCENE_ICONS, STAGE_ICONS } from '../art/scene.js'
import { metaArt } from '../art/meta.js'
import { PAL, svg, ground, hilite, tone3, ball, r1, deepFreeze } from '../art/kit.js'
import { resetTours } from '../../core/tour.js'

/** Nút tròn "?" (vùng chạm 44px, nhãn trợ năng "Hướng dẫn"). */
export function helpButton(app, { className = '' } = {}) {
  return h('button', {
    class: ['help-btn', className], type: 'button', testid: 'help-button', 'aria-label': 'Hướng dẫn', title: 'Hướng dẫn',
    onclick: () => { app.sound('click'); openHelp(app) }
  }, h('span', { 'aria-hidden': 'true' }, '?'))
}

// ---------- Hình của bảng Hướng dẫn (viewBox 0 0 64 64) ----------

// Cung tròn tâm (cx, cy) bán kính r từ góc a0 tới a1 (độ, chiều kim đồng hồ) → d; kèm điểm cuối và hướng tiếp tuyến.
function arc(cx, cy, r, a0, a1) {
  const P = a => [r1(cx + r * Math.cos(a * Math.PI / 180)), r1(cy + r * Math.sin(a * Math.PI / 180))]
  const [x0, y0] = P(a0), [x1, y1] = P(a1)
  return { d: `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`, end: [x1, y1], dir: a1 + 90 }
}
// Đầu mũi tên tam giác tại p, hướng deg.
function head(p, deg, s, fill) {
  const a = deg * Math.PI / 180, c = Math.cos(a), si = Math.sin(a)
  const pt = (u, v) => `${r1(p[0] + u * c - v * si)} ${r1(p[1] + u * si + v * c)}`
  return `<path d="M${pt(s, 0)}L${pt(-s * 0.6, s * 0.85)}L${pt(-s * 0.6, -s * 0.85)}Z" fill="${fill}" stroke-width="2.2"/>`
}
const inked = (d, color, w = 4) => `<path d="${d}" fill="none" stroke-width="${r1(w + 3.4)}"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`
const GO = ['#43a63d', '#2c8429', '#8edb6a']
const PAPER = ['#fffaf0', '#f1e2c2', '#ffffff']

// Xem lại hướng dẫn màn này: huy hiệu giấy tròn, mũi tên vòng đỏ, nút phát vàng.
const R1 = arc(32, 30, 14.5, -50, 235)
const XEM_LAI = svg(ground(32, 58, 18, 3) + ball(32, 30, 24, 24, PAPER, { sw: 3 }) +
  inked(R1.d, PAL.do[0], 4.4) + head(R1.end, R1.dir, 6.4, PAL.do[0]) +
  `<path d="M28 23L39.5 30L28 37Z" fill="${PAL.sao[0]}" stroke-width="2.4"/>` + hilite(29.6, 27.6, 1.6, 2.4, 0.7))

// Cách chơi: bảng phấn trên giá gỗ, dòng phấn và dấu ✓.
const BANG_PHAN = svg(ground(32, 58.4, 22, 3) +
  inked('M19 44L13 56M45 44L51 56', PAL.go_dam[0], 3) +
  tone3({ outline: 'M9 8H55C57 8 58 9 58 11V43C58 45 57 46 55 46H9C7 46 6 45 6 43V11C6 9 7 8 9 8Z', base: PAL.go[0], dark: PAL.go[1], shade: 'M6 41H58V43C58 45 57 46 55 46H9C7 46 6 45 6 43Z', shine: hilite(14, 10.4, 5, 1.2, 0.6) }) +
  `<rect x="11" y="13" width="42" height="28" rx="2" fill="#2f4a43" stroke-width="2.2"/>` +
  `<path d="M16 20H29M16 26.5H33M16 33H25" stroke="#f6f1e3" stroke-width="2.4"/>` +
  `<path d="M38 26L42.4 30.6L49 20.4" fill="none" stroke="${PAL.sao[0]}" stroke-width="3"/>` +
  `<rect x="40" y="42.6" width="9" height="3.4" rx="1.5" fill="#fff" stroke-width="1.6"/>`)

// Xem lại tất cả từ đầu: xấp ba thẻ hướng dẫn (thẻ trước có dấu hỏi), huy hiệu xanh mũi tên vòng.
const QM = `<path d="M25.6 23.4C25.6 18.6 30 16.6 33.6 17.6C37.6 18.8 38.4 23.8 35.2 26.2C33 27.8 31.8 28.8 31.8 32" fill="none" stroke-width="6.4"/>` +
  `<path d="M25.6 23.4C25.6 18.6 30 16.6 33.6 17.6C37.6 18.8 38.4 23.8 35.2 26.2C33 27.8 31.8 28.8 31.8 32" fill="none" stroke="${PAL.do[0]}" stroke-width="3.2"/>` +
  `<circle cx="31.8" cy="38" r="2.6" fill="${PAL.do[0]}" stroke-width="1.8"/>`
const R2 = arc(48, 45, 5.6, -40, 230)
const XAP_THE = svg(ground(31, 58.4, 20, 3) +
  `<g transform="rotate(-14 30 32)"><rect x="14" y="10" width="30" height="42" rx="4" fill="#f1dfba" stroke-width="2.6"/></g>` +
  `<g transform="rotate(-4 30 32)"><rect x="14" y="10" width="30" height="42" rx="4" fill="#f8ecd2" stroke-width="2.6"/></g>` +
  `<g transform="rotate(8 30 32)">` + tone3({ outline: 'M18 10H42C44 10 45 11 45 13V49C45 51 44 52 42 52H18C16 52 15 51 15 49V13C15 11 16 10 18 10Z', base: '#fffaf0', dark: '#f1e2c2', shade: 'M40 10.4C43.6 10.6 45 11.6 45 13V49C45 51 44 52 42 52H20C38 48 40 30 40 10.4Z' }) + QM + `</g>` +
  ball(48, 45, 11, 11, GO, { sw: 2.8 }) + inked(R2.d, '#fff', 2.4) + head(R2.end, R2.dir, 3.6, '#fff'))

/** Hình của bảng Hướng dẫn (id → SVG 64): xem lại màn này, cách chơi, xem lại tất cả. */
export const HELP_ART = deepFreeze({ xem_lai: XEM_LAI, bang_phan: BANG_PHAN, xap_the: XAP_THE })

// ---------- Trang Cách chơi ----------

// Hình đầu thẻ theo id thẻ (hình mới M5); id lạ thì dùng icon trong dữ liệu ('di_sau' = mặt Dì Sáu).
const HOW_HEAD = Object.freeze({
  quay: () => SCENE_ICONS.tab_quay, bep: () => SCENE_ICONS.tab_bep, sao: () => SCENE_ICONS.hud_sao,
  su_kien: () => metaArt('su_kien'), hang_hiem: () => metaArt('ganh_hang'), meo: () => DI_SAU.vui
})
function cardIcon(c) {
  const f = HOW_HEAD[c.id]
  const art = f ? f() : (c.icon === 'di_sau' ? DI_SAU.vui : (metaArt(c.icon) || icon(c.icon)))
  return svgBox(art, 'how-icon')
}

// Bốn khâu theo thứ tự ca bán (biểu tượng khâu của scene.js).
const STAGES = Object.freeze([['order', 'Order'], ['thanh_toan', 'Thanh toán'], ['tinh_tien', 'Tính tiền'], ['lam_do', 'Làm đồ']])
// Thao tác bếp: dụng cụ / nguyên liệu và tên thao tác.
const MOVES = Object.freeze([
  ['thai', 'dao_thep', 'Thái'], ['got', 'dao_bao', 'Gọt'], ['dap', 'trung_ga', 'Đập trứng'], ['xoay', 'muong_khuay', 'Khuấy'],
  ['lac', 'binh_lac', 'Lắc'], ['bay', 'da', 'Thả đá'], ['lua', 'chao_chong_dinh', 'Canh lửa'], ['rot', 'ly', 'Rót']
])

// Dải hình minh họa của từng thẻ (không có thì null).
function cardArt(id) {
  if (id === 'quay') {
    return h('ol', { class: 'how-flow', 'aria-hidden': 'true' }, STAGES.map(([k, label], i) => h('li', { class: 'how-flow-step', dataset: { stage: k } },
      h('span', { class: 'how-flow-no' }, String(i + 1)),
      svgBox(SCENE_ICONS[STAGE_ICONS[k]], 'how-flow-ico'),
      h('span', { class: 'how-flow-label' }, label))))
  }
  if (id === 'bep') {
    return h('ul', { class: 'how-moves', 'aria-hidden': 'true' }, MOVES.map(([k, ic, label]) => h('li', { class: 'how-move', dataset: { move: k } },
      svgBox(icon(ic), 'how-move-ico'),
      h('span', { class: 'how-move-label' }, label))))
  }
  if (id === 'sao') {
    const star = SCENE_ICONS.hud_sao
    return h('div', { class: 'how-stars', 'aria-hidden': 'true' },
      h('span', { class: 'how-stars-row' }, [0, 1, 2, 3, 4].map(() => svgBox(star, 'how-star'))),
      h('span', { class: 'how-tip' }, svgBox(SCENE_ICONS.dong_xu, 'how-tip-ico'), h('b', null, '+5.000đ')))
  }
  if (id === 'su_kien') {
    return h('div', { class: 'how-row', 'aria-hidden': 'true' },
      ['troi_mua', 'cho_phien', 'kiem_tra_attp'].map(k => svgBox(metaArt(k), 'how-row-ico')))
  }
  if (id === 'hang_hiem') {
    return h('div', { class: 'how-row is-chain', 'aria-hidden': 'true' },
      ['ganh_hang', 'manh_cong_thuc', 'kho_hiem'].map(k => svgBox(metaArt(k), 'how-row-ico')))
  }
  return null
}

/** Trang "Cách chơi": các thẻ giấy có hình (dữ liệu HOW_TO_PLAY). */
export function howToPlay(app) {
  const cards = app.data.HOW_TO_PLAY || []
  return h('section', { class: 'how-to-play', testid: 'how-to-play' },
    h('div', { class: 'how-head' }, svgBox(BANG_PHAN, 'how-head-ico'), h('h2', { class: 'modal-title how-title' }, 'Cách chơi')),
    h('ul', { class: 'how-list' }, cards.map(c => h('li', { class: ['how-card', 'how-' + c.id], testid: 'how-card-' + c.id },
      h('div', { class: 'how-card-head' }, cardIcon(c), h('b', { class: 'how-card-title' }, c.title)),
      cardArt(c.id),
      h('div', { class: 'how-text' }, h('p', null, c.text))))))
}

/**
 * Mở bảng Hướng dẫn. → Promise (đóng bảng; nếu chọn xem lại thì tour đã bắt đầu).
 */
export function openHelp(app) {
  if (app.locked || (app.tour && app.tour.isActive())) return Promise.resolve(null)
  if (typeof app.modalOpen === 'function' && app.modalOpen()) return Promise.resolve(null)
  const tour = app.tour
  const TOURS = app.data.TOURS || {}
  // giữ màn trước (ca dừng, bước mini-game dở dừng lại) rồi mới xem màn đang ở khâu nào
  if (tour) tour.hold('help', true)
  const ids = tour ? tour.screenTours() : []
  const names = ids.map(id => TOURS[id] && TOURS[id].name).filter(Boolean)
  const done = app.modal({
    testid: 'help-sheet', className: 'help-modal', dismissible: true,
    render: close => {
      const box = h('div', { class: 'help-box' })
      const fill = (...nodes) => { box.textContent = ''; for (const n of nodes) if (n) box.appendChild(n) }
      const closeBtn = (label = 'Đóng') => h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-close', onclick: () => close(null) }, label)
      const focusFirst = () => {
        const b = box.querySelector('button:not(:disabled)')
        if (b) setTimeout(() => b.focus({ preventScroll: true }), 30)
      }
      // Ô lựa chọn: hình to bên trái, tên Baloo + dòng phụ, mũi tên.
      const choice = (testid, art, title, sub, onclick, disabled = false) => h('button', {
        class: 'choice help-choice', type: 'button', testid, disabled, onclick
      }, svgBox(art, 'help-choice-ico'),
      h('span', { class: 'help-choice-text' }, h('b', null, title), h('small', null, sub)),
      h('span', { class: 'help-choice-go', 'aria-hidden': 'true' }, '›'))
      const menu = () => {
        fill(
          h('div', { class: 'help-head' }, svgBox(DI_SAU_POSES.ngon_cai || DI_SAU.vui, 'npc-face small help-disau'),
            h('div', { class: 'help-head-text' }, h('h2', { class: 'modal-title help-title' }, 'Hướng dẫn'),
              h('p', { class: 'small muted help-bubble' }, 'Con cần dì chỉ lại chỗ nào?'))),
          h('div', { class: 'choice-list help-choices' },
            choice('help-replay', XEM_LAI, 'Xem lại hướng dẫn màn này',
              ids.length ? names.join(' · ') : 'Chỗ này chưa có hướng dẫn riêng, con xem Cách chơi nha.', () => close('replay'), !ids.length),
            choice('help-how', BANG_PHAN, 'Cách chơi', 'Tóm tắt luật chơi trong vài thẻ ngắn.', () => how()),
            choice('help-reset', XAP_THE, 'Xem lại tất cả hướng dẫn từ đầu', 'Mỗi màn, mỗi khâu sẽ hướng dẫn lại lần đầu con ghé.', () => confirmReset())),
          h('div', { class: 'modal-actions' }, closeBtn()))
        focusFirst()
      }
      const how = () => {
        fill(howToPlay(app),
          h('div', { class: 'modal-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-back', onclick: () => menu() }, '‹ Quay lại'),
            h('button', { class: 'btn btn-primary', type: 'button', testid: 'help-close', onclick: () => close(null) }, 'Đã hiểu')))
        const card = box.closest('.modal')
        if (card) card.scrollTop = 0
        focusFirst()
      }
      const confirmReset = () => {
        fill(
          h('div', { class: 'help-head' }, svgBox(XAP_THE, 'npc-face small help-disau is-art'), h('h2', { class: 'modal-title help-title' }, 'Xem lại từ đầu?')),
          h('p', { class: 'modal-text help-reset-text', testid: 'help-reset-text' }, 'Dì sẽ hướng dẫn lại mọi màn và mọi khâu như lần đầu, kể cả chỗ con đã xem. Tiến trình chơi giữ nguyên.'),
          h('div', { class: 'modal-actions' },
            h('button', { class: 'btn btn-ghost', type: 'button', testid: 'help-reset-cancel', onclick: () => menu() }, 'Thôi'),
            h('button', { class: 'btn btn-primary', type: 'button', testid: 'help-reset-confirm', onclick: () => close('reset') }, 'Xem lại từ đầu')))
        focusFirst()
      }
      menu()
      return box
    }
  })
  return done.then(v => {
    try {
      if (v === 'replay' && tour) {
        // bắt đầu tour TRƯỚC khi thôi giữ màn (bước mini-game không bị mở lại rồi dừng ngay)
        const now = tour.screenTours()
        const p = now.length ? tour.start(now) : Promise.resolve('empty')
        p.then(r => { if (r === 'empty') app.toast('Chỗ này chưa có hướng dẫn riêng.', { kind: 'info' }) })
      } else if (v === 'reset' && app.state) {
        resetTours(app.state)
        app.saveNow()
        app.toast('Dì sẽ hướng dẫn lại từng màn khi con ghé tới.', { kind: 'good', testid: 'help-reset-done' })
        if (tour) tour.wantScreen()
      }
    } finally {
      if (tour) tour.hold('help', false)
    }
    return v
  })
}
