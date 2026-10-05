// Mảnh giao diện dùng chung cho các màn ngoài ca (Chợ Công Thức, Việc hôm nay, Hộp thư, Sự kiện, Lên chặng, Sổ…):
// đầu màn kiểu game (thanh gỗ + biển treo), viên Tiền quán / Muỗng Vàng, chấm đỏ, thanh tiến độ, phần thưởng thành ô vật
// phẩm có hình, đếm ngược, xe đẩy theo đồ thẩm mỹ, hình NPC, hiệu ứng nhận quà.
// M5 Đợt 3 (gói M-N, bản 0.5.2): vẽ lại theo phong cách đã duyệt (Phòng mẫu, Bếp 0.5.0, Quầy 0.5.1): lớp g-, font Baloo 2,
// viền mực nâu, hình src/ui/art/meta.js (import thẳng), người bán thân src/ui/art/people.js. Không đổi luật, tiền, điểm.
// Import trong Node an toàn: không chạm DOM ở cấp module (chỉ bảng hằng, Map số đếm chấm đỏ).
import { h, svgBox } from '../dom.js'
import { icon, escapeXml, DI_SAU, ANH_KHOA, CO_HANH } from '../art.js'
import { metaArt, ENTRY_ART } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { DI_SAU_POSES, ANH_KHOA_BUSTS, CO_HANH_BUSTS } from '../art/people.js'
import { INK, PAL, r1, ground, hilite, tone3 } from '../art/kit.js'
import { formatVND, formatMoneyShort, formatK } from '../format.js'
import { rewardBurst } from '../vfx.js'
import { helpButton } from './help.js'

const HOUR = 3600000
const DAY = 24 * HOUR

/** Câu hiển thị cho mã lý do từ chối của lõi meta. */
export function reasonText(app, reason) {
  const R = (app.data.STRINGS && app.data.STRINGS.reasons) || {}
  return R[reason] || 'Chưa làm được lúc này'
}

/** Tên tiền sự kiện (vd "Phấn Trắng"); không rõ sự kiện thì "Tem". */
export function eventCurrency(data, eventId) {
  const ev = eventId && data.EVENTS && data.EVENTS[eventId]
  return (ev && ev.currencyName) || 'Tem'
}

// id hình của tiền sự kiện (EVENTS[id].currencyId, vd 'phan_trang'); không rõ thì 'tem'.
function currencyArt(data, eventId) {
  const ev = eventId && data && data.EVENTS && data.EVENTS[eventId]
  return (ev && ev.currencyId && metaArt(ev.currencyId) ? ev.currencyId : null) || 'phan_trang'
}

function upgradeName(data, id) {
  const U = data.UPGRADES || {}
  const u = Array.isArray(U) ? U.find(x => x.id === id) : U[id]
  return (u && u.name) || id
}

/**
 * Tách phần thưởng (đã quy đổi) thành các mẩu. opts.currency: tên tiền sự kiện cho Tem.
 * Mỗi mẩu: { icon (id hình cũ của art.js), text (chữ đầy đủ, dùng cho rewardLine và nhãn trợ năng), kind,
 *            art (id hình meta.js ưu tiên, null = dùng icon), qty (số ở góc ô: "+7k", "+5", "×2", '' nếu không có),
 *            name (tên ngắn hiện cạnh ô cho hiện vật có tên; '' với tiền / Muỗng Vàng / danh tiếng / Tem) }.
 * Thuần (không DOM): test Node gọi được.
 */
export function rewardParts(reward, data, opts = {}) {
  const r = reward || {}
  const D = data || {}
  const out = []
  if (r.money) out.push({ icon: 'lanh_luong', text: '+' + formatVND(r.money), kind: 'money', art: 'xu', qty: '+' + formatK(r.money), name: '' })
  if (r.gold) out.push({ icon: 'muong_vang', text: `${r.gold} Muỗng Vàng`, kind: 'gold', art: 'muong_vang', qty: '+' + r.gold, name: '' })
  if (r.rep) out.push({ icon: 'sao', text: `+${r.rep} danh tiếng`, kind: 'rep', art: 'sao_lon', qty: '+' + r.rep, name: '' })
  if (r.tem) out.push({ icon: 'phan_trang', text: `${r.tem} ${opts.currency || eventCurrency(D, r.eventId)}`, kind: 'tem', art: currencyArt(D, r.eventId), qty: '+' + r.tem, name: '' })
  for (const [id, n] of Object.entries(r.items || {})) {
    const it = D.ITEMS && D.ITEMS[id]
    const ic = (it && it.icon) || id
    out.push({ icon: ic, text: (it ? it.name : id) + (n > 1 ? ` ×${n}` : ''), kind: 'item', art: metaArt(ic) ? ic : null, qty: n > 1 ? '×' + n : '', name: it ? it.name : id })
  }
  if (r.upgrade) out.push({ icon: r.upgrade, text: upgradeName(D, r.upgrade), kind: 'upgrade', art: null, qty: '', name: upgradeName(D, r.upgrade) })
  if (r.recipe) {
    const rec = D.RECIPES && D.RECIPES[r.recipe]
    const ic = (rec && rec.icon) || r.recipe
    out.push({ icon: ic, text: 'Công thức ' + (rec ? rec.name : r.recipe), kind: 'recipe', art: metaArt(ic) ? ic : null, qty: '', name: rec ? rec.name : r.recipe })
  }
  if (r.cosmetic) {
    const c = D.COSMETICS && D.COSMETICS[r.cosmetic]
    out.push({ icon: 'danh_hieu', text: c ? c.name : r.cosmetic, kind: 'cosmetic', art: 'qua', qty: '', name: c ? c.name : r.cosmetic })
  }
  if (r.title) {
    const t = D.TITLES && D.TITLES[r.title]
    out.push({ icon: 'danh_hieu', text: `Danh hiệu "${t ? t.name : r.title}"`, kind: 'title', art: 'danh_hieu', qty: '', name: t ? t.name : r.title })
  }
  if (r.unlock) {
    const u = D.UNLOCKS && D.UNLOCKS[r.unlock]
    out.push({ icon: 'danh_hieu', text: 'Mở thẻ ' + (u ? `"${u.name}"` : r.unlock), kind: 'unlock', art: 'kho_hiem', qty: '', name: u ? u.name : r.unlock })
  }
  if (r.tipId) {
    const n = r.tipCount > 1 ? r.tipCount : 1
    out.push({ icon: 'thot', text: n > 1 ? `${n} thẻ Mẹo nghề mới` : 'Thẻ Mẹo nghề mới', kind: 'tip', art: 'so_tay_nghe', qty: n > 1 ? '×' + n : '', name: 'Mẹo nghề' })
  }
  // M4: nguyên liệu hiếm và mảnh công thức hiếm
  for (const [id, n] of Object.entries(r.rare || {})) {
    const g = D.INGREDIENTS && D.INGREDIENTS[id]
    out.push({ icon: (g && g.icon) || id, text: `${n} phần ${g ? g.name : id}`, kind: 'rare', art: null, qty: '×' + n, name: g ? g.name : id })
  }
  for (const [id, n] of Object.entries(r.fragments || {})) {
    const rec = D.RECIPES && D.RECIPES[id]
    out.push({ icon: (rec && rec.icon) || id, text: `${n} mảnh công thức ${rec ? rec.name : id}`, kind: 'fragment', art: 'manh_cong_thuc', qty: '×' + n, name: rec ? rec.name : id })
  }
  return out
}

/** Hình SVG của một mẩu thưởng: hình meta.js nếu có, không thì icon() của art.js. */
export function partArt(p) {
  return (p && p.art && metaArt(p.art)) || icon(p ? p.icon : 'fallback')
}

/** Phần thưởng thành 1 dòng chữ: "10 Muỗng Vàng · Phiếu Chợ Sớm". */
export function rewardLine(reward, data, opts) {
  const parts = rewardParts(reward, data, opts).map(p => p.text)
  return parts.length ? parts.join(' · ') : 'Lời nhắn'
}

/**
 * Một ô vật phẩm có hình (dùng chung: phần thưởng, quà cuối chuỗi, lượt Giỏ chợ…).
 * itemTile(svg, { kind, qty, name, label, testid, big }) → span.rw-chip.rw-<kind>[role=img][aria-label=label]
 *   > span.rw-slot > (span.rw-art > svg) + b.rw-qty ; + span.rw-name (khi có name).
 * label: chữ đầy đủ cho trình đọc màn hình và title (bắt buộc nên có); qty: số ở góc dưới phải; name: tên ngắn cạnh ô.
 */
export function itemTile(svg, { kind = 'item', qty = '', name = '', label = '', testid = null, big = false } = {}) {
  const text = label || name || qty || ''
  return h('span', {
    class: ['rw-chip', 'rw-' + kind, name ? 'has-name' : '', big ? 'is-big' : ''], role: 'img', 'aria-label': text || null, title: text || null, testid
  },
  h('span', { class: 'rw-slot' }, svgBox(svg || '', 'rw-art rw-icon'), qty ? h('b', { class: 'rw-qty', 'aria-hidden': 'true' }, qty) : null),
  name ? h('span', { class: 'rw-name', 'aria-hidden': 'true' }, name) : null)
}

/**
 * Phần thưởng thành các ô vật phẩm có hình (xu, Muỗng Vàng, sao danh tiếng, Tem/Phấn, mảnh công thức, nguyên liệu hiếm,
 * hiện vật…) + số lượng ở góc dưới; hiện vật có tên thì tên ngắn hiện cạnh ô. Chữ đầy đủ ở aria-label / title của từng ô.
 * opts: { compact (ô nhỏ hơn), slots (chỉ ô, không tên), currency, art (giữ cho tương thích: luôn dùng hình meta) }.
 */
export function rewardChips(reward, data, opts = {}) {
  const parts = rewardParts(reward, data, opts)
  return h('span', { class: ['rw-chips', opts.compact ? 'compact' : '', opts.slots ? 'is-slots' : ''], role: 'list' },
    parts.map(p => {
      const t = itemTile(partArt(p), { kind: p.kind, qty: p.qty, name: opts.slots ? '' : p.name, label: p.text })
      t.setAttribute('role', 'listitem')
      t.setAttribute('aria-label', p.text)
      return t
    }))
}

// ---------- Viên Tiền quán / Muỗng Vàng ----------

/** Viên Muỗng Vàng (luôn ghi rõ chữ "Muỗng Vàng" cho trình đọc màn hình; data-amount = số thật). */
export function spoonPill(n, testid = null, compact = false) {
  return h('span', { class: ['pill', 'pill-spoon', compact ? 'compact' : ''], testid, 'aria-label': `${n} Muỗng Vàng`, title: 'Muỗng Vàng', dataset: { amount: n } },
    svgBox(metaArt('muong_vang') || icon('muong_vang'), 'pill-icon'), h('b', { class: 'pill-num' }, String(n)),
    compact ? null : h('span', { class: 'pill-cap' }, 'Muỗng Vàng'))
}

/** Viên Tiền quán (ví gỗ như HUD Quầy; compact: số gọn "1,16tr" từ 1 triệu, số đủ ở title / aria-label). */
export function moneyPill(n, testid = null, compact = false) {
  return h('span', { class: ['pill', 'pill-money', compact ? 'compact' : ''], testid, 'aria-label': `Tiền quán ${formatVND(n)}`, title: `Tiền quán ${formatVND(n)}`, dataset: { amount: n } },
    svgBox(SCENE_ICONS.hud_vi || icon('lanh_luong'), 'pill-icon'),
    compact ? null : h('span', { class: 'pill-cap' }, 'Tiền quán'),
    h('b', { class: 'pill-num' }, compact ? formatMoneyShort(n) : formatVND(n)))
}

// ---------- Đầu màn ----------

// Mũi tên quay lại (vẽ bằng nét mực, không chữ).
const BACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 4.5L8 12l7.5 7.5" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M15.5 4.5L8 12l7.5 7.5" fill="none" stroke="#3a2618" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

// Hình cũ màn con đang truyền (opts.icon) → hình lối vào tương ứng của meta.js.
const ICON_ALIAS = Object.freeze({ lich: 'viec_hom_nay', thu: 'hop_thu', ro: 'cho_cong_thuc' })
// Màn con không có ô lối vào ở màn Chuẩn bị nhưng vẫn có hình đầu màn.
const SCREEN_ART = Object.freeze({ ...ENTRY_ART, 'stage-up': 'cup' })

/** Hình đầu màn: opts.art (id meta.js / art.js) → hình theo tên màn (ENTRY_ART; Lên chặng: cúp) → opts.icon (đổi sang hình meta). */
export function headArt(opts = {}, screen = '') {
  if (opts.art) return metaArt(opts.art) || icon(opts.art)
  const scr = opts.screen || screen
  if (scr && Object.prototype.hasOwnProperty.call(SCREEN_ART, scr)) return metaArt(SCREEN_ART[scr])
  if (opts.icon) return metaArt(ICON_ALIAS[opts.icon] || opts.icon) || icon(opts.icon)
  return ''
}

/**
 * Đầu màn con kiểu game: thanh gỗ dính đầu (nút quay lại tròn ≥ 44px, viên Tiền quán + Muỗng Vàng, nút "?") và biển
 * treo (hình màn to + tiêu đề Baloo + dòng phụ trên giấy).
 * opts: { title, sub, back (tên màn, mặc định 'prep'), backLabel (chữ nhắc ở title của nút), onBack, icon, art, screen, help }
 * - Giữ testid meta-back (aria-label "Quay lại"), meta-wallet, meta-spoons; lớp .meta-head (tour STICKY), .meta-title,
 *   .meta-sub, .meta-title-icon, nút "?" (help: true) có lớp meta-help nằm trong .meta-head.
 * - Hình: opts.art → ENTRY_ART[opts.screen || màn hiện tại] → opts.icon (đổi sang hình meta.js).
 */
export function screenHead(app, opts = {}) {
  const st = app.state
  const back = () => {
    app.sound('click')
    if (typeof opts.onBack === 'function') opts.onBack()
    else app.go(opts.back || 'prep')
  }
  const backText = String(opts.backLabel || '‹ Quay lại').replace(/^[‹<\s]+/, '').trim() || 'Quay lại'
  const screen = (app.router && app.router.name) || ''
  const art = headArt(opts, screen)
  return h('header', { class: ['meta-head', 'g-head-meta', art ? 'has-art' : ''] },
    h('div', { class: 'meta-head-row g-head-bar' },
      h('button', { class: 'btn btn-ghost meta-back g-back-meta', type: 'button', testid: 'meta-back', onclick: back, 'aria-label': 'Quay lại', title: 'Về ' + backText },
        svgBox(BACK_SVG, 'g-back-ico')),
      h('div', { class: 'meta-pills' }, moneyPill(st.wallet, 'meta-wallet', true), spoonPill(st.goldSpoons || 0, 'meta-spoons', true)),
      // nút "?" ở cuối thanh gỗ: luôn dính đầu màn, trúng chạm cả khi đã cuộn tới đáy
      opts.help ? helpButton(app, { className: 'meta-help' }) : null),
    h('div', { class: 'meta-title-row g-head-sign' },
      art ? svgBox(art, 'meta-title-icon') : null,
      h('div', { class: 'meta-title-text' },
        h('h1', { class: 'meta-title' }, opts.title || ''),
        opts.sub ? h('p', { class: 'meta-sub', title: opts.sub }, opts.sub) : null)))
}

// ---------- Thanh tiến độ ----------

// Đầu thanh: sao (mặc định), xu (opts.cap 'coin'), hoặc id hình meta.js; false = không có.
function capArt(cap) {
  if (cap === false) return ''
  if (cap === 'coin') return metaArt('xu')
  if (typeof cap === 'string' && cap !== 'star') return metaArt(cap) || icon(cap)
  return SCENE_ICONS.hud_sao || metaArt('sao_lon')
}

/**
 * Thanh tiến độ kiểu game cur/target (hoặc tỉ lệ 0..1 khi target = null): rãnh gỗ, phần đầy màu kẹo, đầu thanh có hình
 * sao (opts.cap: 'star' | 'coin' | id hình | false). Nhãn số đặt ngoài (".quest-num", ".chain-num" — chữ Baloo).
 * opts: { label (aria-label), kind (thêm lớp pbar-<kind>), cap }.
 */
export function progressBar(cur, target = null, opts = {}) {
  const frac = target === null ? Math.max(0, Math.min(1, Number(cur) || 0)) : (target > 0 ? Math.max(0, Math.min(1, cur / target)) : 0)
  const cap = capArt(opts.cap)
  return h('div', {
    class: ['pbar', 'g-pbar', frac >= 1 ? 'is-full' : '', frac <= 0 ? 'is-empty' : '', opts.kind ? 'pbar-' + opts.kind : '', cap ? 'has-cap' : ''], role: 'progressbar',
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-label': opts.label || null,
    style: { '--pbar-f': frac.toFixed(3) }
  },
  h('div', { class: 'pbar-fill', style: { width: (frac * 100).toFixed(1) + '%' } }),
  cap ? svgBox(cap, 'pbar-cap') : null)
}

/** Khoảng thời gian còn lại: "2 ngày 5 giờ", "3 giờ 20 phút", "12 phút". */
export function durationText(ms) {
  const v = Math.max(0, Number(ms) || 0)
  const d = Math.floor(v / DAY)
  const hh = Math.floor((v % DAY) / HOUR)
  const mm = Math.floor((v % HOUR) / 60000)
  if (d > 0) return hh > 0 ? `${d} ngày ${hh} giờ` : `${d} ngày`
  if (hh > 0) return mm > 0 ? `${hh} giờ ${mm} phút` : `${hh} giờ`
  return `${Math.max(1, mm)} phút`
}

// ---------- Chấm đỏ ----------

// Số đã hiện lần trước của từng chấm (theo testid): chấm chỉ nảy MỘT LẦN khi số tăng (hoặc lần đầu hiện), vẽ lại cùng
// số thì không nảy lại. Chỉ giữ số (không giữ phần tử) để không rò bộ nhớ khi màn vẽ lại.
const DOT_SEEN = new Map()

/**
 * dotBump(key, n) → true khi chấm `key` nên nảy (n > 0 và lớn hơn số đã ghi lần trước, hoặc lần đầu thấy); ghi lại n.
 * key rỗng → false (không nhớ được). Thuần theo bảng nhớ của module (test Node gọi được).
 */
export function dotBump(key, n) {
  if (!key) return false
  const v = Math.max(0, Math.floor(Number(n) || 0))
  const prev = DOT_SEEN.has(key) ? DOT_SEEN.get(key) : null
  if (DOT_SEEN.size > 200 && prev === null) DOT_SEEN.clear()
  DOT_SEEN.set(key, v)
  return v > 0 && (prev === null || v > prev)
}

/** Chấm đỏ báo có việc cần làm (kèm số khi n > 1): đỏ cà chua, viền trắng; nảy một lần khi số tăng (theo testid). */
export function redDot(n = 1, testid = null) {
  const bump = dotBump(testid, n)
  if (!n) return null
  // chấm trống không có nút chữ con (để :empty áp dụng)
  return h('span', { class: ['red-dot', n > 1 ? 'has-num' : '', bump ? 'is-bump' : ''], testid, 'aria-label': n > 1 ? `${n} mục mới` : 'Có mục mới' }, n > 1 ? String(Math.min(n, 99)) : null)
}

// ---------- Xe đẩy ----------

function isLight(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85
}

// Dù mặc định: dù cũ thuê lại của Dì Sáu (màu gạch phai).
export const DEFAULT_UMBRELLA = Object.freeze({ color: '#c9774f', alt: '#f3e6cf' })

/** Tùy chọn vẽ xe theo đồ thẩm mỹ đang dùng (du / bien / trang_tri). */
export function cartOptions(state, data, override = {}) {
  const C = data.COSMETICS || {}
  const eq = { ...((state.cosmetics && state.cosmetics.equipped) || {}), ...override }
  const du = eq.du && C[eq.du]
  const opts = { name: state.shopName || '', umbrellaColor: DEFAULT_UMBRELLA.color, umbrellaAlt: DEFAULT_UMBRELLA.alt, pattern: null, sign: null, decor: null }
  if (du && du.color) {
    opts.umbrellaColor = du.color
    opts.umbrellaAlt = isLight(du.color) ? '#9ad0e8' : '#ffffff'
    opts.pattern = du.pattern || null
  }
  if (eq.bien === 'vien_khai_truong') opts.sign = 'vien'
  else if (eq.bien === 'bang_den_tri_an') opts.sign = 'den'
  if (eq.trang_tri === 'chau_hoa_tri_an') opts.decor = 'chau_hoa'
  return opts
}

const HEX6 = /^#[0-9a-f]{6}$/i
// Trộn hai màu #rrggbb (t = 0 → a, 1 → b).
function mixHex(a, b, t) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
  const A = p(a), B = p(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/**
 * Xe đẩy kiểu cel-shading như cảnh Quầy 0.5.1 (viền mực, gỗ mật ong, sọc đỏ, tủ kính bánh mì): dù 8 múi theo màu đồ thẩm
 * mỹ (umbrellaColor / umbrellaAlt, pattern 'soc' xen 3 màu), biển tên giấy ghi tên xe, sign 'vien' (viền Khai Trương) /
 * 'den' (dãy bóng đèn), decor 'chau_hoa' (chậu hoa). Thuần → chuỗi SVG viewBox 0 0 240 170.
 */
export function cartArt({ name = '', umbrellaColor = DEFAULT_UMBRELLA.color, umbrellaAlt = DEFAULT_UMBRELLA.alt, pattern = null, sign = null, decor = null } = {}) {
  const c0 = HEX6.test(String(umbrellaColor)) ? umbrellaColor : DEFAULT_UMBRELLA.color
  const c1 = HEX6.test(String(umbrellaAlt)) ? umbrellaAlt : '#ffffff'
  const cyc = pattern === 'soc' ? [c0, c1, '#e0584a', c1] : [c0, c1]
  // dù: 8 múi từ đỉnh, mép dưới lượn; mảng tối dưới mỗi múi, nửa phải tối hơn (ánh sáng trên-trái)
  const AX = 120, AY = 12, L = 16, R = 224, BY = 58, SEG = 8, DIP = 11
  const xs = []
  for (let k = 0; k <= SEG; k++) xs.push(L + (R - L) * k / SEG)
  let wedges = '', seams = '', rim = `M${AX} ${AY}L${L} ${BY}`
  for (let k = 0; k < SEG; k++) {
    const a = xs[k], b = xs[k + 1], m = (a + b) / 2
    const fill = cyc[k % cyc.length]
    wedges += `<path d="M${AX} ${AY}L${r1(a)} ${BY}Q${r1(m)} ${BY + DIP} ${r1(b)} ${BY}Z" fill="${fill}" stroke="none"/>`
    wedges += `<path d="M${r1(a + 2)} ${BY - 3}Q${r1(m)} ${BY + 6} ${r1(b - 2)} ${BY - 3}L${r1(b)} ${BY}Q${r1(m)} ${BY + DIP} ${r1(a)} ${BY}Z" fill="${mixHex(fill, INK, k >= SEG / 2 ? 0.3 : 0.18)}" stroke="none"/>`
    if (k > 0) seams += `<path d="M${AX} ${AY + 5}L${r1(a)} ${BY}" fill="none" stroke-width="1.75"/>`
    rim += `Q${r1(m)} ${BY + DIP} ${r1(b)} ${BY}`
  }
  const canopy = wedges + `<path d="M${AX} ${AY}L${R} ${BY}L${r1(xs[SEG - 2])} ${BY - 1}Z" fill="${INK}" opacity=".13" stroke="none"/>` +
    hilite(80, 34, 26, 6, 0.45, -24) + seams + `<path d="${rim}Z" fill="none"/>` + `<circle cx="${AX}" cy="${AY - 2}" r="4.5" fill="${PAL.go_dam[0]}"/>`
  const pole = `<rect x="${AX - 3.5}" y="${BY + 4}" width="7" height="${96 - BY}" rx="2" fill="${PAL.thep[0]}" stroke-width="2.5"/>` +
    `<path d="M${AX + 1.5} ${BY + 8}V94" stroke="${PAL.thep[1]}" stroke-width="2"/>`
  // tủ kính bánh mì, hũ, ly trên mặt quầy
  const glass = tone3({ outline: 'M42 92V70C42 67 44 65 47 65H107C110 65 112 67 112 70V92Z', base: PAL.thep[0], dark: PAL.thep[1], shade: 'M106 66C109 66 112 68 112 71V92H106Z' }) +
    `<rect x="48" y="70" width="58" height="19" rx="2" fill="#e9f6fb" stroke-width="1.75"/>` +
    `<path d="M54 86C54 81 60 80 66 80C72 80 76 81 76 85C76 88 71 88 65 88C59 88 54 88 54 86Z" fill="${PAL.banh[0]}" stroke-width="1.75"/>` +
    `<path d="M73 85C73 80 79 79 85 79C91 79 96 80 96 84C96 87 91 87 85 87C79 87 73 87 73 85Z" fill="${PAL.banh[0]}" stroke-width="1.75"/>` +
    `<path d="M60 83L64 81M80 82L84 80" stroke="${PAL.banh[1]}" stroke-width="1.5"/>` +
    `<path d="M52 72L58 84M62 72L64 76" stroke="#fff" stroke-width="2" opacity=".85"/>`
  const jar = tone3({ outline: 'M152 92V76C152 73 154 72 157 72H171C174 72 176 73 176 76V92Z', base: PAL.tra[0], dark: PAL.tra[1], shade: 'M170 72C174 72 176 74 176 77V92H170Z', shine: hilite(158, 80, 2, 5, 0.6) }) +
    `<rect x="154" y="66" width="20" height="7" rx="2" fill="${PAL.do[0]}" stroke-width="2.5"/>` +
    `<path d="M184 92L186 80H196L198 92Z" fill="#eef6fb" stroke-width="2"/>`
  // thân xe gỗ: mặt quầy, ván trước có sọc đỏ, mảng tối dưới-phải
  const top = `<rect x="28" y="91" width="184" height="10" rx="4" fill="${PAL.go[2]}"/><path d="M33 94H207" stroke="#fff" stroke-width="2" opacity=".6"/>`
  const front = tone3({ outline: 'M34 101H206V140C206 143 204 145 201 145H39C36 145 34 143 34 140Z', base: PAL.go[0], dark: PAL.go[1], shade: 'M196 101H206V140C206 143 204 145 201 145H62C150 145 192 138 196 101Z' }) +
    `<path d="M36 105H204" stroke="${PAL.do[0]}" stroke-width="4"/><path d="M58 109V143M182 109V143" stroke="${PAL.go[1]}" stroke-width="1.75"/>`
  // biển tên giấy (tên xe là chữ bắt buộc trong hình)
  const SX = 62, SY = 111, SW = 116, SH = 26
  const raw = String(name || 'Bếp Khởi Nghiệp').trim() || 'Bếp Khởi Nghiệp'
  const label = raw.length > 22 ? raw.slice(0, 21) + '…' : raw
  const maxW = SW - 10
  const size = Math.max(9, Math.min(15, Math.floor(maxW / (0.52 * Math.max(1, label.length)))))
  const fit = label.length * 0.52 * size > maxW
  const plate = `<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="5" fill="#fff8e6" stroke-width="2.5"/>` +
    `<path d="M${SX + 3} ${SY + SH - 4}H${SX + SW - 3}" stroke="#ead9b6" stroke-width="2.5"/>` +
    `<text x="${SX + SW / 2}" y="${r1(SY + SH / 2 + size * 0.36)}" font-family="'Baloo 2', system-ui, sans-serif" font-size="${size}" font-weight="800" text-anchor="middle" fill="#a42a1d" stroke="none"` +
    (fit ? ` textLength="${maxW}" lengthAdjust="spacingAndGlyphs"` : '') + `>${escapeXml(label)}</text>`
  let deco = ''
  if (sign === 'vien') {
    deco = `<rect x="${SX - 4}" y="${SY - 4}" width="${SW + 8}" height="${SH + 8}" rx="7" fill="none" stroke="#f7b928" stroke-width="3.5"/>` +
      `<rect x="${SX - 6}" y="${SY - 6}" width="${SW + 12}" height="${SH + 12}" rx="8" fill="none" stroke-width="1.75"/>` +
      `<circle cx="${SX - 4}" cy="${SY - 4}" r="3" fill="${PAL.do[0]}" stroke-width="1.5"/><circle cx="${SX + SW + 4}" cy="${SY - 4}" r="3" fill="${PAL.do[0]}" stroke-width="1.5"/>`
  } else if (sign === 'den') {
    for (let i = 0; i < 8; i++) deco += `<circle cx="${r1(SX + 6 + i * (SW - 12) / 7)}" cy="${SY - 3}" r="3.2" fill="${i % 2 ? '#ffe28a' : '#fff6d0'}" stroke-width="1.5"/>`
  }
  const handle = `<path d="M204 112L232 98" stroke-width="7"/><path d="M204 112L232 98" stroke="${PAL.thep[0]}" stroke-width="3"/>`
  const wheel = x => `<circle cx="${x}" cy="148" r="14" fill="#3d4250"/><circle cx="${x}" cy="148" r="5.5" fill="#c9ccd1" stroke-width="2"/>` +
    `<path d="M${x - 8} 142a10 10 0 0 1 6 -4" fill="none" stroke="#6b7283" stroke-width="2.5"/>`
  const pot = decor === 'chau_hoa'
    ? `<path d="M2 128H30L27 148H6Z" fill="#c8813b"/><path d="M8 132H25" stroke="#a5672b" stroke-width="2"/><path d="M16 128V110" stroke="#3f8f2f" stroke-width="2.5"/>` +
      `<circle cx="16" cy="106" r="6" fill="#f5c542"/><circle cx="8" cy="115" r="5" fill="#fff"/><circle cx="24" cy="115" r="5" fill="#fff"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    ground(120, 162, 104, 5) + pole + canopy + glass + jar + top + front + plate + deco + handle + wheel(72) + wheel(168) + pot + '</g></svg>'
}

/** Phần tử hình xe đẩy theo đồ thẩm mỹ đang dùng (lớp cart-view, testid cart-view, data-umbrella / data-color để kiểm thử). */
export function cartView(state, data, cls = 'cart-view', override = {}) {
  const o = cartOptions(state, data, override)
  const eq = { ...((state.cosmetics && state.cosmetics.equipped) || {}), ...override }
  return h('div', { class: cls, testid: 'cart-view', dataset: { umbrella: eq.du || 'mac_dinh', color: o.umbrellaColor }, html: cartArt(o), 'aria-hidden': 'true' })
}

// ---------- NPC ----------

/** Mặt NPC của chuỗi nhiệm vụ (Dì Sáu, Anh Khoa, Cô Hạnh) — mặt tròn 64 của people.js (thông báo, ô nhỏ). */
export function npcFace(npc) {
  if (npc === 'anh_khoa') return ANH_KHOA.vui
  if (npc === 'co_giao') return CO_HANH.vui
  return DI_SAU.vui
}

/**
 * Bán thân NPC (viewBox 96 × 112, people.js): Dì Sáu giơ ngón cái (mood 'claim': vỗ tay mừng có quà chờ nhận), Anh Khoa
 * đang hướng dẫn, Cô Hạnh vui.
 */
export function npcBust(npc, mood = '') {
  if (npc === 'anh_khoa') return ANH_KHOA_BUSTS.huong_dan || ANH_KHOA.vui
  if (npc === 'co_giao') return CO_HANH_BUSTS.vui || CO_HANH.vui
  return (mood === 'claim' ? DI_SAU_POSES.vo_tay : DI_SAU_POSES.ngon_cai) || DI_SAU.vui
}

/**
 * Lời nhắc khi giờ máy bị lùi: quà theo ngày tạm khóa, vẫn chơi bình thường (chữ chứa "lùi").
 * opts.icon: chuỗi SVG thay hình mặc định (lịch); hình có lớp rewind-ico (+ ps-strip-ico khi truyền opts.icon).
 */
export function rewindNote(app, nowInfo, opts = {}) {
  if (!nowInfo || !nowInfo.rewind) return null
  const o = opts && typeof opts === 'object' ? opts : {}
  return h('p', { class: 'rewind-note', testid: 'rewind-note', role: 'status' },
    svgBox(o.icon || metaArt('o_lich'), o.icon ? 'rewind-ico ps-strip-ico' : 'rewind-ico'),
    h('span', { class: 'rewind-text' }, app.data.STRINGS.meta.rewindLocked))
}

// ---------- Hiệu ứng nhận quà ----------

/**
 * rewardFx(reward) → { money, gold, other } (thuần): phần nào của phần thưởng bay về ví (money, đồng), về Muỗng Vàng
 * (gold) và số mẩu còn lại (other: danh tiếng, Tem, hiện vật, thẻ Mẹo nghề…) nổ sao tại chỗ.
 */
export function rewardFx(reward, data = null) {
  const r = reward || {}
  const parts = rewardParts(r, data || {})
  return {
    money: Math.max(0, Math.round(Number(r.money) || 0)),
    gold: Math.max(0, Math.round(Number(r.gold) || 0)),
    other: parts.filter(p => p.kind !== 'money' && p.kind !== 'gold').length
  }
}

/**
 * Hiệu ứng nhận quà ("nhân bản rồi bay"): GỌI SAU KHI màn đã vẽ lại, với `from` là phần tử / hình chữ nhật đã lấy TRƯỚC
 * khi vẽ lại (vd btn.getBoundingClientRect()). Xu bay về viên Tiền quán, muỗng bay về viên Muỗng Vàng (tìm theo testid
 * meta-wallet / prep-wallet, meta-spoons / prep-spoons, hoặc opts.wallet / opts.spoons), phần khác nổ sao tại chỗ; số trên
 * viên đếm lên (data-amount đã là số cuối). Giảm chuyển động: dấu tĩnh + một nhịp sáng ở viên (src/ui/vfx.js rewardBurst).
 * Không phát gì lên bus, không âm (màn gọi tự phát 'coin' / 'chest'). → Promise (kết thúc khi hiệu ứng xong; không có vfx
 * thì null ngay).
 */
export function celebrateReward(app, from, reward, opts = {}) {
  const fx = app && app.vfx
  if (!fx || !from || !reward) return Promise.resolve(null)
  const doc = typeof document !== 'undefined' ? document : null
  const q = id => (doc ? doc.querySelector(`[data-testid="${id}"]`) : null)
  const wallet = opts.wallet || q('meta-wallet') || q('prep-wallet')
  const spoons = opts.spoons || q('meta-spoons') || q('prep-spoons')
  const f = rewardFx(reward, app.data)
  const items = []
  if (f.money && wallet) items.push({ kind: 'coin', amount: f.money, to: wallet })
  if (f.gold && spoons) items.push({ kind: 'spoon', n: f.gold, to: spoons, html: metaArt('muong_vang') })
  if (f.other || (!items.length && (f.money || f.gold))) items.push({ kind: 'star', n: Math.min(3, Math.max(1, f.other)) })
  // số trên viên đếm lên (chữ hiển thị; data-amount giữ số thật)
  const count = (el, add, fmt, step = 1) => {
    if (!el || !add || typeof fx.countUp !== 'function') return
    const num = el.matches && el.matches('b') ? el : el.querySelector && el.querySelector('b')
    const to = Number(el.dataset && el.dataset.amount)
    if (!num || !Number.isFinite(to)) return
    // một nhịp sáng đã do rewardBurst vẽ ở viên (không vẽ thêm vòng thứ hai quanh con số); tiền đếm theo bậc 500đ
    try { fx.countUp(num, to - add, to, 900, fmt, { step, glow: false }) } catch { /* bỏ qua */ }
  }
  if (opts.count !== false) {
    count(wallet, f.money, formatMoneyShort, 500)
    count(spoons, f.gold, v => String(v))
  }
  return rewardBurst(fx, from, items)
}
