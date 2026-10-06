// Màn mở đầu: lần đầu đặt tên xe (hoặc nhập mã sao lưu từ máy khác), lần sau vào quán.
// M3: màn chờ vào quán hiện ngẫu nhiên 1 thẻ Mẹo nghề đã mở (Sổ tay nghề).
// M5 Đợt 3 (gói M-E, bản 0.5.2): màn mở đầu kiểu game — logo chữ Baloo 2 viền mực, cảnh phố đầu hẻm (dãy nhà ống, cột
// điện dây chằng chịt, cổng hẻm: SVG vẽ ở đây theo quy chuẩn mục 6.1; trời và vỉa hè là nền CSS), xe đẩy cel-shading
// (meta-ui.cartArt, tên xe sơn lên biển ngay khi gõ), Dì Sáu bán thân (people.js) đứng ở góc cảnh, lời Dì Sáu trong khung
// thoại giấy có đuôi chỉ lên dì, ô đặt tên là biển gỗ có bảng phấn "Tên xe", nút "Bắt đầu" / "Vào quán" / "Chơi tiếp"
// bánh kẹo lớn. Không đổi luật: tên xe, nhập mã, vào ca như cũ.
// Giữ testid và lớp mà e2e + tour bám: screen-title, shop-name-input, start-button, title-import, title-talk, title-tip,
// .title-shop (chứa ĐÚNG tên xe), .title-cart. Import trong Node an toàn: hình dựng lười, không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { DI_SAU_POSES, DI_SAU } from '../art.js'
import { SCENE_ICONS } from '../art/scene.js'
import { metaArt } from '../art/meta.js'
import { INK, PAL, svg, hilite, tone3, ball, r1 } from '../art/kit.js'
import { cartOptions, cartArt } from '../components/meta-ui.js'
import { openImport } from './settings.js'
import { randomSeenTip } from '../../core/notebook.js'

export const DEFAULT_SHOP_NAME = 'Xe bánh mì đầu hẻm'

// ---------- Cảnh phố đầu hẻm (SVG 360 × 120, đáy = mép vỉa hè) ----------
// Quy chuẩn vẽ: viền mực INK, ba tông (nền, mảng tối bên phải, điểm sáng trên-trái), không gradient / filter / clipPath /
// mask / <use> / href / url(. Dãy nhà xa nhạt màu, viền mực mờ để lùi ra sau; nhà gần viền mực đủ đậm.

// Cửa sổ có khung, kính xanh nhạt và hai cánh chớp.
function windowAt(x, y, w, hh, shutter) {
  const s = r1(Math.min(7, w * 0.3))
  return `<rect x="${r1(x - s)}" y="${y}" width="${s}" height="${hh}" rx="1.5" fill="${shutter}" stroke-width="2"/>` +
    `<rect x="${x + w}" y="${y}" width="${s}" height="${hh}" rx="1.5" fill="${shutter}" stroke-width="2"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="1.5" fill="#d9f2fc" stroke-width="2.2"/>` +
    `<path d="M${x + w / 2} ${y + 1}V${y + hh - 1}M${x + 1} ${y + hh / 2}H${x + w - 1}" stroke-width="1.5"/>` +
    `<path d="M${x + 3} ${y + hh - 4}L${x + w / 2 - 2} ${y + 3}" stroke="#fff" stroke-width="2" opacity=".8"/>`
}

// Lan can ban công: thanh ngang + song đứng.
function railing(x0, x1, y, hh = 10) {
  let bars = ''
  for (let x = x0 + 4; x < x1 - 2; x += 6) bars += `M${r1(x)} ${y}V${y + hh}`
  return `<path d="${bars}" stroke-width="1.6"/><path d="M${x0} ${y}H${x1}M${x0} ${y + hh}H${x1}" stroke-width="2.4"/>`
}

// Mái hiên sọc đỏ trắng nhỏ trên cửa tầng trệt.
function awning(x0, x1, y) {
  let s = ''
  const n = Math.max(3, Math.round((x1 - x0) / 9))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) s += `<path d="M${r1(x0 + i * w)} ${y}H${r1(x0 + (i + 1) * w)}L${r1(x0 + (i + 1) * w + 1.5)} ${y + 9}H${r1(x0 + i * w + 1.5)}Z" fill="${i % 2 ? '#fffaf0' : '#e8483a'}" stroke="none"/>`
  return s + `<path d="M${x0} ${y}H${x1}L${x1 + 1.5} ${y + 9}H${x0 + 1.5}Z" fill="none" stroke-width="2"/>`
}

function house({ x, w, top, wall, dark, roof }) {
  const R = x + w, B = 121
  const body = tone3({
    outline: `M${x} ${B}V${top}H${R}V${B}Z`, base: wall, dark,
    shade: `M${R - Math.min(10, w * 0.16)} ${top + 6}H${R}V${B}H${R - Math.min(10, w * 0.16)}Z`,
    shine: `<rect x="${x + 4}" y="${top + 5}" width="${Math.min(22, w * 0.3)}" height="4" rx="2" fill="#fff" opacity=".45" stroke="none"/>`
  })
  const cap = `<path d="M${x - 3} ${top}H${R + 3}V${top - 6}H${x - 3}Z" fill="${roof}" stroke-width="2.4"/>`
  return body + cap
}

let SCENE_CACHE = ''
/** Cảnh phố đầu hẻm (chuỗi SVG, viewBox 0 0 360 120). Thuần, dựng một lần. */
export function alleySvg() {
  if (SCENE_CACHE) return SCENE_CACHE
  // dãy nhà xa
  const far = `<g opacity=".55" stroke-width="2"><path d="M-2 121V40H20V28H44V44H60V22H86V121Z" fill="#efd3a6"/>` +
    `<path d="M150 121V30H170V18H190V34H206V121Z" fill="#e9caa0"/><path d="M262 121V26H290V36H318V20H344V121Z" fill="#efd3a6"/></g>`
  // nhà A (vàng, 2 tầng, ban công)
  const a = house({ x: 0, w: 76, top: 34, wall: '#f6d79a', dark: '#e2b866', roof: '#c96f4a' }) +
    windowAt(12, 44, 16, 18, '#5fae79') + windowAt(48, 44, 16, 18, '#5fae79') + railing(4, 72, 66) +
    awning(10, 66, 92)
  // nhà B (hồng, 3 tầng, cao nhất)
  const b = house({ x: 76, w: 66, top: 10, wall: '#f4b8a2', dark: '#dc927a', roof: '#8f4a32' }) +
    windowAt(90, 18, 14, 16, '#3f86c8') + windowAt(118, 18, 12, 16, '#3f86c8') +
    windowAt(90, 50, 14, 16, '#3f86c8') + windowAt(118, 50, 12, 16, '#3f86c8') + railing(80, 138, 70, 9) +
    // chậu cây trên ban công
    ball(98, 66, 6, 4.4, PAL.la, { sw: 2 }) + ball(126, 66, 5, 4, PAL.hanh, { sw: 2 })
  // hẻm: tường cuối hẻm, lối đi, cổng hẻm (bảng đỏ không chữ trên hai cột)
  const alley = `<path d="M142 121V52H178V121Z" fill="#c99d6e" stroke-width="2.4"/>` +
    `<path d="M150 121L156 60H166L172 121Z" fill="#e3c08f" stroke="none"/>` +
    `<path d="M148 80H172M146 96H174" stroke="#a87b4f" stroke-width="1.6"/>` +
    `<path d="M145 121V30M175 121V30" stroke-width="3.4"/><path d="M145 121V30M175 121V30" stroke="#d9dde3" stroke-width="1.6"/>` +
    `<rect x="140" y="22" width="40" height="13" rx="3" fill="#e8483a" stroke-width="2.4"/>` +
    `<path d="M146 28.5H174" stroke="#ffe27a" stroke-width="2" stroke-dasharray="4 3"/>` +
    hilite(150, 25, 6, 1.4, 0.5)
  // nhà C (xanh trời, cửa cuốn, máy lạnh)
  const c = house({ x: 182, w: 76, top: 26, wall: '#a9d3e8', dark: '#7fb3cf', roof: '#2c66a0' }) +
    windowAt(194, 36, 16, 18, '#e8483a') + `<rect x="226" y="38" width="22" height="14" rx="2" fill="#f2f4f6" stroke-width="2"/>` +
    `<path d="M229 42H245M229 46H245" stroke="#aebbc9" stroke-width="1.5"/>` +
    `<rect x="190" y="78" width="60" height="43" rx="1" fill="#c9ccd1" stroke-width="2.2"/>` +
    `<path d="M191 85H249M191 92H249M191 99H249M191 106H249M191 113H249" stroke="#9aa3ae" stroke-width="1.5"/>`
  // nhà D (kem, 2 tầng) và cây xanh trước nhà
  const d = house({ x: 258, w: 104, top: 38, wall: '#fbe7c4', dark: '#e8cc9c', roof: '#b8302a' }) +
    windowAt(272, 48, 16, 18, '#7cc35a') + windowAt(316, 48, 16, 18, '#7cc35a') + railing(262, 356, 70) +
    awning(300, 352, 90)
  const tree = `<path d="M330 121V86" stroke-width="5"/><path d="M330 121V86" stroke="#9a5f32" stroke-width="2.4"/>` +
    ball(330, 70, 22, 18, PAL.la, { sw: 2.6 }) + ball(312, 82, 12, 10, PAL.la, { sw: 2.4, shine: false }) +
    ball(348, 82, 12, 10, PAL.la, { sw: 2.4, shine: false })
  // cột điện bê tông, xà ngang và dây điện võng (chằng chịt như phố thật)
  const pole = `<rect x="177" y="-2" width="8" height="124" rx="2" fill="#d9dde3" stroke-width="2.4"/>` +
    `<path d="M182.6 2V120" stroke="#aebbc9" stroke-width="2"/>` +
    `<rect x="164" y="10" width="34" height="6" rx="2" fill="#aebbc9" stroke-width="2"/>` +
    `<rect x="186" y="22" width="9" height="12" rx="2" fill="#6b7283" stroke-width="2"/>`
  const wires = `<g fill="none" stroke-width="1.6">` +
    `<path d="M166 13C120 30 60 30 -4 20"/><path d="M168 16C110 40 50 38 -4 34"/><path d="M196 13C250 30 300 28 364 18"/>` +
    `<path d="M194 16C240 38 300 40 364 32"/><path d="M190 34C210 44 236 46 262 40"/></g>`
  SCENE_CACHE = svg(far + a + b + alley + c + d + tree + pole + wires, [360, 120])
    .replace('<svg ', '<svg preserveAspectRatio="xMidYMax slice" ')
  return SCENE_CACHE
}

// Đinh đóng biển gỗ (hai góc trên).
const SIGN_NAILS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#c9ccd1" stroke="${INK}" stroke-width="2"/></svg>`

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const state = app.state
    const first = !state.shopName
    const cart = h('div', { class: 'title-cart ti-cart', 'aria-hidden': 'true' })
    // hình xe theo màu dù / đồ trang trí đang dùng (Góc Muỗng Vàng); tên xe sơn lên biển trước xe
    const paintCart = name => { cart.innerHTML = cartArt({ ...cartOptions(app.state, app.data), name: name || DEFAULT_SHOP_NAME }) }

    const enter = () => {
      app.sound('click')
      if (app.state.shift) app.go('service')
      else app.go('prep')
    }

    // Cảnh: trời, dãy nhà, vỉa hè, xe đẩy, Dì Sáu bán thân ở góc trái (thân dưới khuất sau mép cảnh).
    const scene = h('div', { class: ['ti-scene', first ? 'is-first' : ''], 'aria-hidden': 'true' },
      h('div', { class: 'ti-sky' }, h('span', { class: 'ti-sun' }), h('span', { class: 'ti-cloud' }), h('span', { class: 'ti-cloud ti-cloud-2' })),
      h('div', { class: 'ti-street', html: alleySvg() }),
      h('div', { class: 'ti-walk' }),
      cart,
      svgBox((first ? DI_SAU_POSES.vo_tay : DI_SAU_POSES.ngon_cai) || DI_SAU.vui, 'ti-disau'))

    // Khung thoại giấy (đuôi chỉ lên Dì Sáu): tên người nói + lời.
    const talkBox = (attrs, ...body) => h('div', { class: 'ti-talk', ...attrs },
      h('b', { class: 'ti-talk-name' }, 'Dì Sáu'),
      ...body)

    const logo = h('div', { class: 'ti-logo-wrap' },
      h('h1', { class: 'game-title ti-logo' }, S.gameTitle),
      h('p', { class: 'tagline ti-tagline' }, S.tagline))

    let body
    if (first) {
      const input = h('input', {
        class: 'input ti-name-input', type: 'text', testid: 'shop-name-input', maxLength: 30, value: DEFAULT_SHOP_NAME,
        placeholder: S.labels.shopNamePlaceholder, 'aria-label': S.labels.shopName, autocomplete: 'off', spellcheck: 'false',
        oninput: e => paintCart(e.target.value.trim())
      })
      const start = () => {
        const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 30) || DEFAULT_SHOP_NAME
        app.state.shopName = name
        app.saveNow()
        enter()
      }
      input.addEventListener('keydown', e => { if (e.key === 'Enter') start() })
      body = [
        talkBox({ testid: 'title-talk' },
          // câu dặn thêm ẩn ở khung thấp (CSS) để nút "Bắt đầu" và "Nhập mã" thấy ngay không phải cuộn
          h('p', { class: 'ti-talk-text' }, app.data.DIALOGUE.diSau.intro,
            h('span', { class: 'ti-talk-more' }, ' Con đặt tên cho xe đi, dì sơn lên tấm bảng liền.'))),
        // biển gỗ: bảng phấn "Tên xe" + ô tên như tấm ván sơn
        h('label', { class: 'field ti-sign' },
          svgBox(SIGN_NAILS, 'ti-nail ti-nail-l'), svgBox(SIGN_NAILS, 'ti-nail ti-nail-r'),
          h('span', { class: 'field-label ti-sign-label' }, S.labels.shopName),
          input),
        h('button', { class: 'btn btn-primary btn-big ti-start', type: 'button', testid: 'start-button', onclick: start },
          svgBox(SCENE_ICONS.tab_quay, 'ti-start-ico'), h('span', { class: 'ti-start-text' }, 'Bắt đầu')),
        // M3: đã chơi ở máy khác → nhập mã sao lưu (xem trước rồi mới dùng)
        h('button', {
          class: 'btn btn-ghost btn-wide ti-import', type: 'button', testid: 'title-import',
          onclick: () => { app.sound('click'); openImport(app) }
        }, 'Đã chơi ở máy khác? Nhập mã sao lưu')
      ]
    } else {
      const tip = randomSeenTip(state, app.ctx, Math.random)
      const greet = state.shift ? `Ca ngày ${state.shift.day} còn dở đó con, vào bán tiếp nha!` : 'Về rồi hả con! Dọn xe ra bán thôi.'
      body = [
        tip
          ? talkBox({ testid: 'title-tip', class: 'ti-talk is-tip' },
            h('p', { class: 'ti-tip-head' }, svgBox(metaArt('so_tay_nghe'), 'ti-tip-ico'), h('span', null, 'Mẹo nghề: ' + tip.title)),
            h('p', { class: 'ti-talk-text' }, tip.text))
          : talkBox(null, h('p', { class: 'ti-talk-text' }, greet)),
        // biển gỗ tên xe (.title-shop chứa ĐÚNG tên xe) + ngày / chặng
        h('div', { class: 'ti-sign ti-sign-shop' },
          svgBox(SIGN_NAILS, 'ti-nail ti-nail-l'), svgBox(SIGN_NAILS, 'ti-nail ti-nail-r'),
          h('p', { class: 'title-shop' }, state.shopName),
          h('p', { class: 'title-sub' }, state.shift ? `Ca ngày ${state.shift.day} đang dở, vào bán tiếp nhé!` : `Ngày ${state.day} · ${S.chang[state.chang] || S.chang[1]}`)),
        h('button', { class: 'btn btn-primary btn-big ti-start', type: 'button', testid: 'start-button', onclick: enter },
          svgBox(SCENE_ICONS.tab_quay, 'ti-start-ico'), h('span', { class: 'ti-start-text' }, state.shift ? S.buttons.continue : S.buttons.start))
      ]
    }
    paintCart(first ? DEFAULT_SHOP_NAME : state.shopName)

    const el = h('section', { class: ['title-screen', 'ti-screen', first ? 'is-first' : 'is-back'], testid: 'screen-title' },
      logo, scene, ...body)
    root.appendChild(el)
    return { unmount() {} }
  }
}
