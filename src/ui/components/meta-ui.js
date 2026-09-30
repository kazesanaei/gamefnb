// Mảnh giao diện dùng chung cho các màn M2 (Chợ Công Thức, Việc hôm nay, Hộp thư, sự kiện, lên chặng):
// đầu màn có nút quay lại, viên tiền/Muỗng Vàng, dòng phần thưởng, thanh tiến độ, đếm ngược, hình xe theo đồ thẩm mỹ.
import { h, svgBox } from '../dom.js'
import { icon, cartSvg, DI_SAU, ANH_KHOA, CO_HANH } from '../art.js'
import { formatVND } from '../format.js'

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

function upgradeName(data, id) {
  const U = data.UPGRADES || {}
  const u = Array.isArray(U) ? U.find(x => x.id === id) : U[id]
  return (u && u.name) || id
}

/**
 * Tách phần thưởng (đã quy đổi) thành các mẩu {icon, text}. opts.currency: tên tiền sự kiện cho Tem.
 */
export function rewardParts(reward, data, opts = {}) {
  const r = reward || {}
  const out = []
  if (r.money) out.push({ icon: 'lanh_luong', text: '+' + formatVND(r.money), kind: 'money' })
  if (r.gold) out.push({ icon: 'muong_vang', text: `${r.gold} Muỗng Vàng`, kind: 'gold' })
  if (r.rep) out.push({ icon: 'sao', text: `+${r.rep} danh tiếng`, kind: 'rep' })
  if (r.tem) out.push({ icon: 'phan_trang', text: `${r.tem} ${opts.currency || eventCurrency(data, r.eventId)}`, kind: 'tem' })
  for (const [id, n] of Object.entries(r.items || {})) {
    const it = data.ITEMS && data.ITEMS[id]
    out.push({ icon: (it && it.icon) || id, text: (it ? it.name : id) + (n > 1 ? ` ×${n}` : ''), kind: 'item' })
  }
  if (r.upgrade) out.push({ icon: r.upgrade, text: upgradeName(data, r.upgrade), kind: 'upgrade' })
  if (r.recipe) {
    const rec = data.RECIPES && data.RECIPES[r.recipe]
    out.push({ icon: (rec && rec.icon) || r.recipe, text: 'Công thức ' + (rec ? rec.name : r.recipe), kind: 'recipe' })
  }
  if (r.cosmetic) {
    const c = data.COSMETICS && data.COSMETICS[r.cosmetic]
    out.push({ icon: 'danh_hieu', text: c ? c.name : r.cosmetic, kind: 'cosmetic' })
  }
  if (r.title) {
    const t = data.TITLES && data.TITLES[r.title]
    out.push({ icon: 'danh_hieu', text: `Danh hiệu "${t ? t.name : r.title}"`, kind: 'title' })
  }
  if (r.unlock) {
    const u = data.UNLOCKS && data.UNLOCKS[r.unlock]
    out.push({ icon: 'danh_hieu', text: 'Mở thẻ ' + (u ? `"${u.name}"` : r.unlock), kind: 'unlock' })
  }
  if (r.tipId) out.push({ icon: 'thot', text: 'Thẻ Mẹo nghề mới', kind: 'tip' })
  return out
}

/** Phần thưởng thành 1 dòng chữ: "10 Muỗng Vàng · Phiếu Chợ Sớm". */
export function rewardLine(reward, data, opts) {
  const parts = rewardParts(reward, data, opts).map(p => p.text)
  return parts.length ? parts.join(' · ') : 'Lời nhắn'
}

/** Phần thưởng thành các viên nhỏ có hình. */
export function rewardChips(reward, data, opts = {}) {
  const parts = rewardParts(reward, data, opts)
  return h('span', { class: ['rw-chips', opts.compact ? 'compact' : ''] },
    parts.map(p => h('span', { class: 'rw-chip rw-' + p.kind }, svgBox(icon(p.icon), 'rw-icon'), h('span', null, p.text))))
}

/** Viên Muỗng Vàng (luôn ghi rõ chữ "Muỗng Vàng" cho trình đọc màn hình). */
export function spoonPill(n, testid = null, compact = false) {
  return h('span', { class: ['pill', 'pill-spoon', compact ? 'compact' : ''], testid, 'aria-label': `${n} Muỗng Vàng`, title: 'Muỗng Vàng', dataset: { amount: n } },
    svgBox(icon('muong_vang'), 'pill-icon'), h('b', null, String(n)), compact ? null : h('span', { class: 'pill-cap' }, 'Muỗng Vàng'))
}

export function moneyPill(n, testid = null, compact = false) {
  return h('span', { class: ['pill', 'pill-money', compact ? 'compact' : ''], testid, 'aria-label': `Tiền quán ${formatVND(n)}`, title: 'Tiền quán', dataset: { amount: n } },
    compact ? svgBox(icon('lanh_luong'), 'pill-icon') : h('span', { class: 'pill-cap' }, 'Tiền quán'), h('b', null, formatVND(n)))
}

/**
 * Đầu màn M2: nút "‹ Quay lại" (≥ 44px), tiêu đề, viên Tiền quán + Muỗng Vàng.
 * opts: { title, sub, back (tên màn, mặc định 'prep'), backLabel, onBack, icon }
 */
export function screenHead(app, opts = {}) {
  const st = app.state
  const back = () => {
    app.sound('click')
    if (typeof opts.onBack === 'function') opts.onBack()
    else app.go(opts.back || 'prep')
  }
  return h('header', { class: 'meta-head' },
    h('div', { class: 'meta-head-row' },
      h('button', { class: 'btn btn-ghost meta-back', type: 'button', testid: 'meta-back', onclick: back, 'aria-label': 'Quay lại' },
        opts.backLabel || '‹ Quay lại'),
      h('div', { class: 'meta-pills' }, moneyPill(st.wallet, 'meta-wallet', true), spoonPill(st.goldSpoons || 0, 'meta-spoons', true))),
    h('div', { class: 'meta-title-row' },
      opts.icon ? svgBox(icon(opts.icon), 'meta-title-icon') : null,
      h('div', null,
        h('h1', { class: 'meta-title' }, opts.title || ''),
        opts.sub ? h('p', { class: 'meta-sub' }, opts.sub) : null)))
}

/** Thanh tiến độ cur/target (hoặc tỉ lệ 0..1 khi target = null). */
export function progressBar(cur, target = null, opts = {}) {
  const frac = target === null ? Math.max(0, Math.min(1, Number(cur) || 0)) : (target > 0 ? Math.max(0, Math.min(1, cur / target)) : 0)
  return h('div', {
    class: ['pbar', frac >= 1 ? 'is-full' : '', opts.kind ? 'pbar-' + opts.kind : ''], role: 'progressbar',
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-label': opts.label || null
  }, h('div', { class: 'pbar-fill', style: { width: (frac * 100).toFixed(1) + '%' } }))
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

/** Chấm đỏ báo có việc cần làm (kèm số khi n > 1). */
export function redDot(n = 1, testid = null) {
  if (!n) return null
  // chấm trống không có nút chữ con (để :empty áp dụng)
  return h('span', { class: ['red-dot', n > 1 ? 'has-num' : ''], testid, 'aria-label': n > 1 ? `${n} mục mới` : 'Có mục mới' }, n > 1 ? String(Math.min(n, 99)) : null)
}

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

/** Phần tử hình xe đẩy theo đồ thẩm mỹ đang dùng (data-umbrella để kiểm thử). */
export function cartView(state, data, cls = 'cart-view', override = {}) {
  const o = cartOptions(state, data, override)
  const eq = { ...((state.cosmetics && state.cosmetics.equipped) || {}), ...override }
  return h('div', { class: cls, testid: 'cart-view', dataset: { umbrella: eq.du || 'mac_dinh', color: o.umbrellaColor }, html: cartSvg(o), 'aria-hidden': 'true' })
}

/** Mặt NPC của chuỗi nhiệm vụ (Dì Sáu, Anh Khoa, Cô Hạnh). */
export function npcFace(npc) {
  if (npc === 'anh_khoa') return ANH_KHOA.vui
  if (npc === 'co_giao') return CO_HANH.vui
  return DI_SAU.vui
}

/** Lời nhắc khi giờ máy bị lùi: quà theo ngày tạm khóa, vẫn chơi bình thường. */
export function rewindNote(app, nowInfo) {
  if (!nowInfo || !nowInfo.rewind) return null
  return h('p', { class: 'rewind-note', testid: 'rewind-note', role: 'status' }, app.data.STRINGS.meta.rewindLocked)
}
