// Phòng mẫu giao diện M5 (mau.html, Đợt 0): trang để người dùng duyệt giao diện mới trước khi ráp vào game.
// Bốn thẻ:
//  - Hình: so hình CŨ (icon() của src/ui/art.js) và MỚI (artV2 / propV2 của src/ui/art/v2.js) ở 48, 72, 120, 200 trên nền
//    giấy và nền gỗ, kèm kệ trưng bày bộ hình mới.
//  - Gọi món: luồng thật bằng các thành phần order-bubble, menu-board, order-sheet, order-pad với dữ liệu RECIPES thật
//    (khách quen Cô Thu; bảng 4 món có món hiếm "★ còn 2" và món "HẾT"; bảng số lượng / ghi chú; phiếu; đọc lại; chốt có
//    con dấu ĐÃ CHỐT rồi phiếu bay lên dây phiếu nhỏ ở đầu màn).
//  - Bếp: Thái: thẻ "Bước 3/6 · Thái dưa leo!" có tay mẫu → bước Thái kiểu mới (ctx.look = 2, qua playStep) → con dấu theo
//    ĐIỂM THẬT + Dì Sáu phản ứng; nút xem nhanh 4 hạng dấu.
//  - Ra món: màn ra món cho 5 hạng, công tắc "Không tì vết" và "Lên cấp".
// Công tắc (nút bánh răng): Giảm chuyển động (lớp reduce-motion trên <html>), Âm thanh, Khung thấp (panel ~300px như màn
// 360×600 trong ca thật).
// App "hộp cát": lớp phủ riêng (#mau-overlay), bus của src/core/bus.js, createAudio, createVfx. KHÔNG đăng ký service
// worker, KHÔNG đọc hay ghi bản lưu của game (localStorage 'bkn.save'); không ghi gì vào bộ nhớ trình duyệt.
// Thẻ đang mở nằm trên địa chỉ (#hinh, #goi-mon, #thai, #ra-mon); ?low=1, ?reduce=1, ?sound=0 bật sẵn công tắc (tiện
// chụp ảnh, gửi link).
// Import trong Node an toàn: cấp module chỉ khai báo hằng và hàm thuần; boot() chỉ chạy khi trang có #mau-screen.
import { DATA } from '../src/data/index.js'
import { createBus } from '../src/core/bus.js'
import { createAudio } from '../src/ui/audio.js'
import { createVfx } from '../src/ui/vfx.js'
import { isReduced } from '../src/ui/motion.js'
import { h, svgBox, clear } from '../src/ui/dom.js'
import { icon, DI_SAU } from '../src/ui/art.js'
import { artV2, propV2 } from '../src/ui/art/v2.js'
import { createStepCard, stepCardModel } from '../src/ui/components/step-card.js'
import { createStamp, playStamp, gradeKey, stampSvg, gradeText } from '../src/ui/components/stamp.js'
import { createDiSauReact, reactLine } from '../src/ui/components/disau-react.js'
import { createDishReveal } from '../src/ui/components/dish-reveal.js'
import { createMenuBoard, dishSvg, dishStyle } from '../src/ui/components/menu-board.js'
import { createOrderBubble } from '../src/ui/components/order-bubble.js'
import { createOrderSheet } from '../src/ui/components/order-sheet.js'
import { createOrderPad } from '../src/ui/components/order-pad.js'
import { playStep } from '../src/ui/minigames/index.js'

// ---------- Dữ liệu mẫu (thuần, test Node đọc được) ----------

const freezeAll = list => Object.freeze(list.map(o => Object.freeze({ ...o })))

/** Bốn thẻ của phòng mẫu: id (cũng là #địa chỉ), nhãn, hình trên thẻ. */
export const MAU_TABS = freezeAll([
  { id: 'hinh', label: 'Hình', art: 'tac' },
  { id: 'goi-mon', label: 'Gọi món', art: 'mon_banh_mi_op_la' },
  { id: 'thai', label: 'Bếp: Thái', art: 'dao_thep' },
  { id: 'ra-mon', label: 'Ra món', art: null }
])

/** Chiều cao panel khi bật "Khung thấp" (panel Quầy / Bếp trong ca thật ở 360×600 cao khoảng 286–318). */
export const LOW_PANEL_PX = 300

/** Các cỡ so hình (đơn vị điểm ảnh CSS). */
export const ART_SIZES = Object.freeze([48, 72, 120, 200])

/**
 * Chủ thể so hình: key (duy nhất), id hình, state (hình trạng thái), prop (đạo cụ sân khấu, khung riêng), name,
 * old (id hình cũ để so; null = bản cũ chưa có), note (dòng giải thích ngắn).
 */
export const ART_SUBJECTS = freezeAll([
  { key: 'dua_leo', id: 'dua_leo', name: 'Dưa leo', old: 'dua_leo' },
  { key: 'dua_leo.lat', id: 'dua_leo', state: 'lat', name: 'Dưa leo thái lát', old: 'dua_leo', note: 'Bản cũ chỉ có hình gốc' },
  { key: 'trung_ga', id: 'trung_ga', name: 'Trứng gà', old: 'trung_ga' },
  { key: 'trung_ga.nut', id: 'trung_ga', state: 'nut', name: 'Trứng gà nứt', old: 'trung_ga', note: 'Bản cũ chỉ có hình gốc' },
  { key: 'trung_ga.op_la', id: 'trung_ga', state: 'op_la', name: 'Trứng ốp la', old: 'trung_ga', note: 'Bản cũ chỉ có hình gốc' },
  { key: 'tac', id: 'tac', name: 'Tắc', old: 'tac' },
  { key: 'tac.bo_doi', id: 'tac', state: 'bo_doi', name: 'Tắc bổ đôi', old: 'tac', note: 'Bản cũ chỉ có hình gốc' },
  { key: 'hanh_la', id: 'hanh_la', name: 'Hành lá', old: 'hanh_la' },
  { key: 'nuoc_tuong', id: 'nuoc_tuong', name: 'Nước tương', old: 'nuoc_tuong', note: 'Cặp dễ nhầm: chai cao, nhãn đậu' },
  { key: 'nuoc_mam', id: 'nuoc_mam', name: 'Nước mắm', old: 'nuoc_mam', note: 'Cặp dễ nhầm: chai thấp, nhãn cá' },
  { key: 'trung_ga_ta', id: 'trung_ga_ta', name: 'Trứng gà ta', old: 'trung_ga_ta', note: 'Hàng hiếm: sao vàng góc trên' },
  { key: 'mon_banh_mi_op_la', id: 'mon_banh_mi_op_la', name: 'Bánh mì ốp la', old: 'mon_banh_mi_op_la' },
  { key: 'mon_tra_tac', id: 'mon_tra_tac', name: 'Trà tắc', old: 'mon_tra_tac' },
  { key: 'thot', id: 'thot', name: 'Thớt', old: 'thot' },
  { key: 'dao_thep', id: 'dao_thep', name: 'Dao thép', old: 'dao_thep' },
  { key: 'thot_lon', id: 'thot_lon', prop: true, name: 'Thớt lớn', old: 'thot', note: 'Đạo cụ sân khấu, khung riêng' },
  { key: 'dao_lon', id: 'dao_lon', prop: true, name: 'Dao lớn', old: 'dao_thep', note: 'Đạo cụ sân khấu, khung riêng' },
  { key: 'tay', id: 'tay', prop: true, name: 'Bàn tay mẫu', old: null, note: 'Bản cũ chưa có' }
])

/** Kệ trưng bày đầu thẻ Hình: hai tầng hình mới. */
export const SHELF_ROWS = Object.freeze([
  Object.freeze(['dua_leo', 'tac', 'hanh_la', 'trung_ga', 'trung_ga_ta']),
  Object.freeze(['nuoc_tuong', 'nuoc_mam', 'mon_banh_mi_op_la', 'mon_tra_tac', 'tac.bo_doi'])
])

/** Khách mẫu ở thẻ Gọi món: Cô Thu (khách quen) gọi 2 bánh mì ốp la (không hành, cay) và 1 trà tắc ít đường. */
export const ORDER_SAMPLE = Object.freeze({
  regularId: 'co_thu',
  name: 'Cô Thu',
  persona: 'co_chu',
  gender: 'nu',
  seed: 7,
  request: Object.freeze([
    Object.freeze({ recipeId: 'banh_mi_op_la', qty: 2, notes: Object.freeze(['khong_hanh', 'cay']) }),
    Object.freeze({ recipeId: 'tra_tac', qty: 1, notes: Object.freeze(['it_duong']) })
  ]),
  menu: Object.freeze(['banh_mi_op_la', 'tra_tac', 'banh_mi_trung_ga_ta', 'tra_tac_mat_ong']),
  left: Object.freeze({ banh_mi_trung_ga_ta: 2, tra_tac_mat_ong: 0 })
})

/** Bước mẫu ở thẻ Bếp: Thái — Thái dưa leo của Bánh mì ốp la, bước 3/6 (đã xong Chọn: Hoàn hảo, Rửa: Tốt). */
export const THAI_SAMPLE = Object.freeze({
  recipeId: 'banh_mi_op_la', stepId: 'thai_dua', index: 3, total: 6, grades: Object.freeze(['hoan_hao', 'tot'])
})

/** Điểm mẫu cho nút xem nhanh 4 hạng dấu (hạng suy từ điểm theo BALANCE.stepLabels). */
export const STAMP_SAMPLES = freezeAll([
  { key: 'hoan_hao', score: 96 },
  { key: 'tot', score: 78 },
  { key: 'dat', score: 58 },
  { key: 'hong', score: 30 }
])

/** Màn ra món mẫu theo hạng món: q (%) nằm đúng khoảng của hạng (BALANCE.gradeThresholds) và một câu góp ý của Dì Sáu. */
export const REVEAL_SAMPLES = Object.freeze({
  tuyet_hao: Object.freeze({ q: 96, comment: 'Trứng chín vàng đều, dưa leo thái đẹp. Khách ăn là ghiền!' }),
  ngon: Object.freeze({ q: 84, comment: 'Thái dưa leo: kéo dao trúng vạch chấm rồi hẵng nhấc tay nha.' }),
  duoc: Object.freeze({ q: 67, comment: 'Chiên trứng chưa tới độ, canh kim vô giữa vùng xanh nha.' }),
  kem: Object.freeze({ q: 48, comment: 'Thiếu hành lá rồi con ơi.' }),
  hong: Object.freeze({ q: 22, comment: 'Chiên trứng bị cháy rồi, nhấc sớm chút nha con.' })
})
export const REVEAL_GRADES = Object.freeze(['tuyet_hao', 'ngon', 'duoc', 'kem', 'hong'])
const FLAWLESS_GRADES = new Set(['tuyet_hao', 'ngon'])

/** '#goi-mon' → 'goi-mon'; thẻ lạ → null. */
export function tabFromHash(hash) {
  const id = String(hash || '').replace(/^#/, '').trim()
  return MAU_TABS.some(t => t.id === id) ? id : null
}

/** Hai dòng phiếu giống nhau: cùng món, cùng số phần, cùng bộ ghi chú (không kể thứ tự). */
export function sameLine(a, b) {
  if (!a || !b) return false
  const notes = l => [...(l.notes || [])].map(String).sort().join('|')
  return a.recipeId === b.recipeId && Number(a.qty) === Number(b.qty) && notes(a) === notes(b)
}

/**
 * Khách soát phiếu khi người bán đọc lại (thuần): trả danh sách lỗi [{ index, type, expectedRecipeId? }] theo nhãn lỗi
 * của quầy (thua_mon, sai_so_luong, sai_ghi_chu, thieu_mon). Rỗng = phiếu đúng.
 */
export function checkReadback(draft = [], request = []) {
  const caught = []
  const used = new Set()
  draft.forEach((l, i) => {
    const exact = request.findIndex((q, k) => !used.has(k) && sameLine(q, l))
    if (exact >= 0) { used.add(exact); return }
    const same = request.findIndex((q, k) => !used.has(k) && q.recipeId === l.recipeId)
    if (same < 0) { caught.push({ index: i, type: 'thua_mon' }); return }
    used.add(same)
    caught.push({ index: i, type: Number(request[same].qty) !== Number(l.qty) ? 'sai_so_luong' : 'sai_ghi_chu' })
  })
  request.forEach((q, k) => { if (!used.has(k)) caught.push({ index: null, type: 'thieu_mon', expectedRecipeId: q.recipeId }) })
  return caught
}

// ---------- Hình nhỏ của trang (SVG nội bộ, viền mực) ----------

const INK = '#3a2618'
const SVG_GEAR = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">` +
  '<path d="M13.4 2.5h5.2l.9 3.7 2.4 1 3.3-2 3.6 3.6-2 3.3 1 2.4 3.7.9v5.2l-3.7.9-1 2.4 2 3.3-3.6 3.6-3.3-2-2.4 1-.9 3.7h-5.2l-.9-3.7-2.4-1-3.3 2-3.6-3.6 2-3.3-1-2.4-3.7-.9v-5.2l3.7-.9 1-2.4-2-3.3 3.6-3.6 3.3 2 2.4-1Z" fill="#f2c47c"/>' +
  '<path d="M9 22.5a9 9 0 0 0 14 0" fill="none" stroke="#a5672b" stroke-width="2" opacity=".55"/>' +
  '<circle cx="16" cy="16" r="5" fill="#fffaf0"/></g></svg>'
const SVG_MEDAL = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2" stroke-linejoin="round">` +
  '<path d="M10.5 17.5L6.5 29.5l4.6-1.8 2.9 3.6 2.6-10.2Z" fill="#e8483a"/><path d="M21.5 17.5l4 12-4.6-1.8-2.9 3.6-2.6-10.2Z" fill="#e8483a"/>' +
  '<circle cx="16" cy="13" r="10.5" fill="#f7b928"/><circle cx="16" cy="13" r="7.2" fill="none" stroke="#fff4b8" stroke-width="1.4" stroke-dasharray="2.4 2"/>' +
  '<path d="M16 7.6l1.7 3.5 3.9.6-2.8 2.7.7 3.8L16 16.4l-3.5 1.8.7-3.8-2.8-2.7 3.9-.6Z" fill="#fff4b8" stroke-width="1.4"/></g></svg>'
const SVG_MOTION = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">` +
  '<circle cx="18" cy="16" r="11" fill="#bfe4ff"/><path d="M14.5 11v10M21.5 11v10" stroke-width="3.4" stroke="#22679a"/>' +
  '<path d="M2.5 11h4M1.5 16h4M2.5 21h4" stroke="#6e5340"/></g></svg>'
const SVG_SOUND = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">` +
  '<path d="M4 12h5l7-6v20l-7-6H4Z" fill="#ffb45c"/><path d="M20.5 11.5a6 6 0 0 1 0 9M24 8a11 11 0 0 1 0 16" fill="none"/></g></svg>'
const SVG_LOW = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">` +
  '<rect x="8" y="2.5" width="16" height="27" rx="3.5" fill="#fffaf0"/><path d="M8 14.5h16v11.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 8 26Z" fill="#8edb6a"/>' +
  '<path d="M11 7h10M11 10.5h6" stroke="#a5672b" stroke-width="2" stroke-linecap="round"/></g></svg>'
const SVG_AGAIN = `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
  '<path d="M25 16a9 9 0 1 1-3-6.7"/><path d="M23.5 3.5v6.5H17"/></g></svg>'
// biển báo tròn có dấu chấm than (thông báo món HẾT)
const SVG_OUT = `<svg viewBox="0 0 32 32" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">` +
  '<circle cx="16" cy="16" r="13" fill="#fff4d8"/><path d="M16 8.5v9.5" stroke-width="3.6" stroke="#b82c1f"/>' +
  '<circle cx="16" cy="23.2" r="1.6" fill="#b82c1f" stroke="#b82c1f"/></g></svg>'

// ---------- Trang ----------

/**
 * boot(doc) dựng phòng mẫu trên trang mau.html. Trả bộ điều khiển (cũng gắn vào window.__mau cho e2e / chụp ảnh):
 * { app, vfx, bus, st, log, setTab(id), setReduce(on), setSound(on), setLow(on), openSettings(), closeSettings() }.
 */
export function boot(doc = document) {
  const win = doc.defaultView || window
  const frame = doc.getElementById('app')
  const overlay = doc.getElementById('mau-overlay')
  const body = doc.getElementById('mau-body')
  const tabsEl = doc.getElementById('mau-tabs')
  const gear = doc.getElementById('mau-gear')
  const logo = doc.getElementById('mau-logo')
  const params = new URLSearchParams(win.location.search)
  const osReduce = (() => { try { return win.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } })()

  const st = {
    tab: tabFromHash(win.location.hash) || 'hinh',
    reduce: params.get('reduce') === '1' || osReduce,
    sound: params.get('sound') !== '0',
    low: params.get('low') === '1'
  }
  const log = { sounds: [], events: [] }

  // ----- App hộp cát -----
  const bus = createBus()
  bus.on('*', (payload, type) => { log.events.push({ type, ...(payload || {}) }); if (log.events.length > 200) log.events.shift() })
  const audio = createAudio(() => ({ sound: st.sound, volume: 0.8 }))
  const app = {
    bus, audio, overlay,
    settings: () => ({ reducedMotion: st.reduce, sound: st.sound, volume: 0.8, vibrate: true }),
    sound(name) {
      log.sounds.push(name)
      if (log.sounds.length > 200) log.sounds.shift()
      try { return audio.play(name) } catch { return false }
    },
    vibrate(ms = 30) {
      // iOS không có navigator.vibrate: bỏ qua im lặng (hiệu ứng hình và âm đã đi kèm)
      try { if (!st.reduce && win.navigator && typeof win.navigator.vibrate === 'function') win.navigator.vibrate(ms) } catch { /* bỏ qua */ }
    }
  }
  const reduced = () => isReduced(app)
  const vfx = createVfx({ host: overlay, reduced })
  app.vfx = vfx
  const sound = name => app.sound(name)

  // iOS Safari chỉ áp :active (nút lún) khi trang có bộ nghe touchstart
  doc.addEventListener('touchstart', () => {}, { passive: true })

  logo.innerHTML = DI_SAU.vui
  gear.innerHTML = SVG_GEAR + '<span class="mau-gear-dot" aria-hidden="true"></span>'

  // ----- Thẻ (tab) -----
  clear(body)
  const views = {}
  const ctrls = {}
  const tabBtns = {}
  for (const t of MAU_TABS) {
    const ico = t.art ? artV2(t.art) : SVG_MEDAL
    const btn = h('button', {
      class: 'mau-tab', type: 'button', role: 'tab', id: 'mau-tab-' + t.id, 'data-testid': 'mau-tab-' + t.id,
      'aria-controls': 'mau-view-' + t.id, 'aria-selected': 'false', tabindex: '-1',
      onclick: () => { sound('click'); setTab(t.id) }
    }, svgBox(ico, 'mau-tab-ico'), h('span', { class: 'mau-tab-label' }, t.label))
    tabBtns[t.id] = btn
    tabsEl.appendChild(btn)
    const view = h('section', {
      class: ['mau-view', 'mau-view--' + t.id], id: 'mau-view-' + t.id, role: 'tabpanel',
      'aria-labelledby': 'mau-tab-' + t.id, 'data-testid': 'mau-view-' + t.id, hidden: true
    })
    views[t.id] = view
    body.appendChild(view)
  }
  // phím mũi tên giữa các thẻ (bàn phím)
  tabsEl.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = MAU_TABS.findIndex(t => t.id === st.tab)
    const n = MAU_TABS[(i + (e.key === 'ArrowRight' ? 1 : MAU_TABS.length - 1)) % MAU_TABS.length]
    setTab(n.id)
    tabBtns[n.id].focus()
  })

  const factories = { hinh: makeHinh, 'goi-mon': makeOrder, thai: makeThai, 'ra-mon': makeReveal }
  let current = null

  function setTab(id, { force = false } = {}) {
    if (!MAU_TABS.some(t => t.id === id)) id = 'hinh'
    if (!force && current === id) return
    if (current && ctrls[current] && ctrls[current].leave) ctrls[current].leave()
    vfx.clear()
    current = id
    st.tab = id
    for (const t of MAU_TABS) {
      const on = t.id === id
      tabBtns[t.id].setAttribute('aria-selected', on ? 'true' : 'false')
      tabBtns[t.id].tabIndex = on ? 0 : -1
      views[t.id].hidden = !on
    }
    if (!ctrls[id]) ctrls[id] = factories[id](views[id])
    ctrls[id].enter()
    try { win.history.replaceState(null, '', '#' + id) } catch { /* trang mở từ tệp: bỏ qua */ }
    bus.emit('mau.tab', { tab: id })
  }
  win.addEventListener('hashchange', () => { const id = tabFromHash(win.location.hash); if (id && id !== current) setTab(id) })

  // ----- Phần dùng chung -----
  // Dải giả "phần trên màn Ca bán" khi bật Khung thấp (panel bên dưới cao LOW_PANEL_PX như trong ca thật).
  function chromeEl() {
    return h('div', { class: 'mau-chrome', 'aria-hidden': 'true' },
      h('span', { class: 'mau-chrome-tag' }, 'Khung thấp'),
      h('span', { class: 'mau-chrome-text' }, 'Phần trên màn Ca bán: HUD, phố, thanh 4 khâu, dây phiếu'))
  }

  // Thông báo ngắn (vd chạm món HẾT): viên nhãn đỏ có viền mực + biểu tượng, nằm ở đáy ngay trên hàng nút `above`
  // (Đọc lại / Chốt) nếu hàng đó đang hiện, không thì sát đáy vùng an toàn. Tự tắt sau TOAST_MS; mở bảng chọn món,
  // đổi thẻ hay dựng lại lượt thì tắt ngay (không đè lên bảng vừa mở).
  const TOAST_MS = 1700
  let toastTimer = 0
  function hideToast() {
    clearTimeout(toastTimer)
    toastTimer = 0
    overlay.querySelectorAll('.mau-toast').forEach(e => e.remove())
  }
  function toast(text, { above = null } = {}) {
    hideToast()
    const t = h('div', { class: 'mau-toast g-pill g-pill--bad', role: 'status', 'aria-live': 'polite', 'data-testid': 'mau-toast' },
      svgBox(SVG_OUT, 'mau-toast-ico'), h('span', { class: 'mau-toast-text' }, text))
    const a = above && above.isConnected && !above.hidden ? above.getBoundingClientRect() : null
    if (a && a.height) {
      const box = overlay.getBoundingClientRect()
      t.style.bottom = Math.max(8, Math.round(box.bottom - a.top + 8)) + 'px'
    }
    overlay.appendChild(t)
    toastTimer = setTimeout(hideToast, TOAST_MS)
  }

  // Nhóm nút chọn một (nút có aria-pressed): [{ v, label, testid, aria?, cls? }] → { el, set(v), btns }
  function seg(items, value, onPick, { cls = '', label = '' } = {}) {
    const btns = items.map(it => h('button', {
      class: ['mau-seg-btn', it.cls || ''], type: 'button', 'data-testid': it.testid, 'aria-pressed': 'false',
      'aria-label': it.aria || null,
      onclick: () => { sound('click'); set(it.v); onPick(it.v) }
    }, it.label))
    const el = h('div', { class: ['mau-seg', cls], role: 'group', 'aria-label': label || null }, btns)
    function set(v) { items.forEach((it, i) => btns[i].setAttribute('aria-pressed', it.v === v ? 'true' : 'false')) }
    set(value)
    return { el, set, btns }
  }

  // Nút bật / tắt (aria-pressed) có dấu ✓
  function toggleBtn({ label, testid, on, onChange }) {
    const b = h('button', {
      class: 'mau-toggle', type: 'button', 'data-testid': testid, 'aria-pressed': on ? 'true' : 'false',
      onclick: () => { sound('click'); const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v ? 'true' : 'false'); onChange(v) }
    }, h('span', { class: 'mau-toggle-box', 'aria-hidden': 'true' }), h('span', { class: 'mau-toggle-text' }, label))
    return b
  }

  // ========== Thẻ Hình ==========
  function makeHinh(view) {
    let bg = 'giay'
    let size = 72
    const shelf = h('section', { class: 'mau-shelf g-wood', 'aria-label': 'Kệ trưng bày bộ hình mới' },
      h('div', { class: 'mau-shelf-sign g-chalk' },
        h('b', { class: 'mau-shelf-title' }, 'Bộ hình mới'),
        h('span', { class: 'mau-shelf-sub' }, 'viền mực nâu · khối 3 tông · bóng đất')),
      SHELF_ROWS.map(row => h('div', { class: 'mau-shelf-row' },
        row.map(key => {
          const [id, state] = key.split('.')
          return svgBox(artV2(id, state), 'mau-shelf-item')
        }),
        h('i', { class: 'mau-shelf-plank', 'aria-hidden': 'true' }))))
    const segBg = seg([
      { v: 'giay', label: 'Giấy', testid: 'mau-bg-giay', aria: 'Nền giấy' },
      { v: 'go', label: 'Gỗ', testid: 'mau-bg-go', aria: 'Nền gỗ' }
    ], bg, v => { bg = v; render() }, { cls: 'mau-seg--bg', label: 'Nền so hình' })
    const segSize = seg(ART_SIZES.map(s => ({ v: s, label: String(s), testid: 'mau-size-' + s, aria: `Cỡ ${s}` })), size,
      v => { size = v; render() }, { cls: 'mau-seg--size', label: 'Cỡ hình' })
    const ctrl = h('div', { class: 'mau-ctrl' },
      h('div', { class: 'mau-ctrl-row' }, h('span', { class: 'mau-ctrl-label' }, 'Nền'), segBg.el),
      h('div', { class: 'mau-ctrl-row' }, h('span', { class: 'mau-ctrl-label' }, 'Cỡ'), segSize.el))
    const legend = h('p', { class: 'mau-legend' },
      h('span', { class: 'g-pill mau-pill-old' }, 'Cũ'), ' hình đang dùng trong game · ',
      h('span', { class: 'g-pill g-pill--gold' }, 'Mới'), ' hình M5 (chưa ráp vào game)')
    const grid = h('div', { class: 'mau-grid', 'data-testid': 'mau-art-grid' })
    view.append(shelf, ctrl, legend, grid)

    function pic(s, which) {
      const svg = which === 'moi' ? (s.prop ? propV2(s.id) : artV2(s.id, s.state)) : (s.old ? icon(s.old) : '')
      const box = { width: size + 'px', height: size + 'px' }
      if (!svg) return h('span', { class: 'mau-pic mau-pic--none', style: box }, h('span', null, 'Chưa có'))
      return svgBox(svg, 'mau-pic', { style: box, dataset: { v: which } })
    }
    function render() {
      clear(grid)
      grid.dataset.size = String(size)
      grid.dataset.bg = bg
      for (const s of ART_SUBJECTS) {
        const well = which => h('div', { class: ['mau-well', bg === 'go' ? 'g-wood g-wood--flat' : 'mau-well--paper'], dataset: { v: which } },
          h('span', { class: ['g-pill', which === 'moi' ? 'g-pill--gold' : 'mau-pill-old', 'mau-well-tag'] }, which === 'moi' ? 'Mới' : 'Cũ'),
          pic(s, which))
        grid.appendChild(h('article', { class: 'mau-card g-paper', 'data-testid': 'mau-art-' + s.key.replace('.', '--') },
          h('div', { class: 'mau-card-head' },
            h('b', { class: 'mau-card-name' }, s.name),
            s.state ? h('span', { class: 'g-pill mau-card-tag' }, 'Trạng thái') : s.prop ? h('span', { class: 'g-pill mau-card-tag' }, 'Đạo cụ') : null),
          h('div', { class: 'mau-card-body' }, well('cu'), well('moi')),
          s.note ? h('p', { class: 'mau-card-note' }, s.note) : null))
      }
    }
    render()
    return {
      enter() {},
      leave() {},
      refresh() {}
    }
  }

  // ========== Thẻ Gọi món ==========
  function makeOrder(view) {
    const R = DATA.RECIPES
    const S = ORDER_SAMPLE
    const ticketEl = (no, recipe, wait, extra = {}) => h('div', { class: 'mau-ticket', dataset: { wait }, ...extra },
      h('b', { class: 'mau-ticket-no' }, no), svgBox(dishSvg(recipe), 'mau-ticket-ico', { style: dishStyle(recipe) || '' }))
    let slot = null
    const tickets = h('div', { class: 'mau-rail-tickets' })
    const count = h('span', { class: 'mau-rail-count' }, 'Phiếu 1/3')
    const rail = h('header', { class: 'mau-rail', 'data-testid': 'mau-rail', 'aria-label': 'Dây phiếu bếp' },
      h('i', { class: 'mau-rail-wire', 'aria-hidden': 'true' }), tickets, count)
    const panel = h('div', { class: 'mau-sim mau-panel', 'data-testid': 'mau-order-panel' })
    view.append(rail, chromeEl(), panel)

    let o = null      // trạng thái lượt gọi món đang chơi
    let c = null      // các thành phần đang gắn
    let sheet = null

    function speechText() {
      let s = S.seed
      const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
      try {
        return DATA.makeSpeech({ request: S.request, persona: S.persona, region: 'nam', recipes: R, rand, gender: S.gender, name: 'Thu', regularId: S.regularId, self: 'cô' })
      } catch { return 'Cho cô 2 ổ bánh mì ốp la với 1 ly trà tắc nha con!' }
    }
    const SPEECH = speechText()

    function leftNow(skip = -1) {
      const out = {}
      for (const id of Object.keys(S.left)) {
        const used = o.draft.reduce((n, l, i) => n + (i !== skip && l.recipeId === id ? l.qty : 0), 0)
        out[id] = Math.max(0, S.left[id] - used)
      }
      return out
    }
    function customer() {
      return {
        persona: S.persona, gender: S.gender, mood: o.mood, name: S.name, regular: true,
        request: o.confirmed ? [] : S.request, speech: o.confirmed ? 'Bao nhiêu tiền vậy con?' : SPEECH, recipes: R, talk: o.talk
      }
    }
    function padData() {
      const key = JSON.stringify(o.draft)
      return {
        draft: o.draft, recipes: R, caught: o.caught, canConfirm: o.readbackDone && o.draft.length > 0,
        hint: o.draft.length && !o.readbackDone && o.readKey !== key ? 'Đọc lại đơn cho khách nghe trước khi chốt.' : '',
        lastAdded: o.lastAdded, sub: 'Cô Thu · khách quen'
      }
    }
    function renderAll() {
      if (!c) return
      c.bubble.update(customer())
      c.menu.update({ recipes: R, menu: S.menu, left: leftNow() })
      c.pad.update(padData())
      o.lastAdded = null
    }
    function changed() { o.readbackDone = false; o.caught = []; o.readKey = null }

    function closeSheet(animated = true) {
      const s = sheet
      sheet = null
      if (!s) return
      if (animated) s.leave()
      else s.destroy()
    }

    function openSheet(id, editIndex) {
      if (sheet || o.confirmed) return
      hideToast()
      const line = editIndex !== null ? o.draft[editIndex] : null
      const rare = R[id].source === 'hiem'
      sheet = createOrderSheet({
        recipe: R[id], qty: line ? line.qty : 1, notes: line ? line.notes.slice() : [], editIndex,
        rareMax: rare ? Math.max(1, leftNow(editIndex === null ? -1 : editIndex)[id]) : null
      }, {
        vfx, sound, reduced,
        onClose: () => closeSheet(true),
        onRemove: () => {
          o.draft.splice(editIndex, 1)
          changed()
          closeSheet(false)
          renderAll()
          bus.emit('mau.order.remove', { index: editIndex })
        },
        onSubmit: (l, { from }) => {
          const index = editIndex !== null ? editIndex : o.draft.length
          if (editIndex !== null) o.draft[editIndex] = l
          else o.draft.push(l)
          changed()
          sound('paper')
          o.lastAdded = index
          renderAll()
          c.pad.reveal(index)
          const target = c.pad.artEl(index)
          if (target && from) vfx.fly(from, target, { node: from, ms: 420, arc: 0.3 })
          closeSheet(false)
          bus.emit('mau.order.line', { index, recipeId: l.recipeId, qty: l.qty })
        }
      })
      overlay.appendChild(sheet.el)
    }

    function doReadback() {
      if (!o.draft.length || o.reading) return
      o.reading = true
      o.talk = [{ who: 'ban', text: DATA.readbackText(o.draft, R) }]
      c.bubble.update(customer())
      const caught = checkReadback(o.draft, S.request)
      o.readKey = JSON.stringify(o.draft)
      c.pad.update(padData())
      bus.emit('mau.order.readback', { ok: !caught.length })
      c.pad.readback({ caught }).then(() => {
        o.reading = false
        if (!c) return
        o.caught = caught
        o.readbackDone = !caught.length
        o.mood = caught.length ? 'buc' : 'vui'
        o.talk = [...o.talk, { who: 'khach', text: caught.length ? 'Ủa, cô đâu có gọi vậy con.' : 'Đúng rồi đó con, làm lẹ giùm cô nghen!' }]
        c.bubble.react(caught.length ? 'bad' : 'ok')
        sound(caught.length ? 'error' : 'ding')
        renderAll()
        c.pad.reveal(null, { smooth: true })
      })
    }

    // Nhịp chốt: con dấu ĐÃ CHỐT đập lên bản sao phiếu (lớp hiệu ứng) → phiếu bay lên dây bếp → phiếu mới nảy trên dây →
    // thẻ "Đã chốt" (con dấu nhỏ đập vào, lời nhắn, nút Gọi món lại) mới hiện. Trong lúc phiếu còn đập dấu / đang bay,
    // panel chỉ còn bóng thoại của khách: màn chỉ có MỘT con dấu, và không có nút nào nằm dưới bản sao phiếu để bấm nhầm.
    function doConfirm() {
      if (!o.readbackDone || o.confirmed) return
      o.confirmed = true
      const round = o
      const target = slot
      // nhân bản phiếu rồi bay (stamp() nhân bản ngay trong lời gọi) → panel vẽ lại tự do bên dưới
      const flight = c.pad.stamp({ target })
      bus.emit('mau.order.confirmed', { lines: o.draft.length })
      o.draft = []
      o.talk = []
      o.readbackDone = false
      o.mood = 'vui'
      c.pad.el.hidden = true
      c.pad.actionsEl.hidden = true
      c.menu.el.hidden = true
      c.bubble.update(customer())
      // Promise của stamp() luôn kết thúc: true = bay tới dây; false = giảm chuyển động (không bay), đổi thẻ hay trang ẩn
      // giữa chừng. Lượt đã bị dựng lại (start()) thì bỏ qua.
      const land = () => {
        if (o !== round || !c) return
        if (target && target.isConnected) {
          const t = ticketEl('#08', R.banh_mi_op_la, 'green', { 'data-testid': 'mau-ticket-new' })
          t.appendChild(h('span', { class: 'mau-ticket-ok', 'aria-hidden': 'true' }, '✓'))
          target.replaceWith(t)
          slot = null
          vfx.pop(t)
          count.textContent = 'Phiếu 2/3'
        }
        showDone()
      }
      flight.then(land, land)
    }

    function showDone() {
      const again = h('button', { class: 'g-btn g-btn--primary mau-done-again', type: 'button', 'data-testid': 'mau-order-again', onclick: () => { sound('click'); start() } },
        svgBox(SVG_AGAIN, 'g-ico'), 'Gọi món lại')
      const done = h('section', { class: 'mau-done g-paper g-paper--lined', 'data-testid': 'mau-order-done' },
        h('span', { class: 'mau-done-stamp', 'data-testid': 'mau-order-stamp', role: 'img', 'aria-label': 'Con dấu: Đã chốt' }, h('span', null, 'ĐÃ CHỐT')),
        h('b', { class: 'mau-done-title' }, 'Đã chốt order'),
        h('p', { class: 'mau-done-text' }, 'Phiếu #08 đã kẹp lên dây bếp ở đầu màn. Trong game, bước tiếp theo là báo tổng tiền.'),
        again)
      panel.appendChild(done)
      // cuộn để thẻ "Đã chốt" (con dấu + nút Gọi món lại) nằm trọn trong panel, kể cả màn thấp
      panel.scrollTop = Math.max(0, done.offsetTop + done.offsetHeight + 12 - panel.clientHeight)
      bus.emit('mau.order.done', {})
    }

    function start() {
      closeSheet(false)
      hideToast()
      if (c) {
        c.bubble.destroy(); c.menu.destroy(); c.pad.destroy()
        c = null
      }
      clear(panel)
      clear(tickets)
      slot = h('div', { class: 'mau-slot', 'aria-hidden': 'true' })
      tickets.append(ticketEl('#07', R.tra_tac, 'yellow'), slot)
      count.textContent = 'Phiếu 1/3'
      o = { draft: [], readbackDone: false, caught: [], talk: [], lastAdded: null, readKey: null, confirmed: false, reading: false, mood: 'vui' }
      const bubble = createOrderBubble(customer(), { vfx, sound, reduced })
      const menu = createMenuBoard({ recipes: R, menu: S.menu, left: leftNow() }, {
        vfx, sound, reduced,
        onPick: id => openSheet(id, null),
        onOut: () => toast(((DATA.STRINGS && DATA.STRINGS.rare) || {}).outOfStock || 'Hết nguyên liệu hiếm cho món này', { above: c && c.pad.actionsEl })
      })
      const pad = createOrderPad(padData(), {
        vfx, sound, reduced,
        onEdit: i => openSheet(o.draft[i].recipeId, i),
        onRemove: i => { o.draft.splice(i, 1); changed(); renderAll() },
        onReadback: doReadback,
        onConfirm: doConfirm
      })
      c = { bubble, menu, pad }
      panel.append(bubble.el, menu.el, pad.el, pad.actionsEl)
      panel.scrollTop = 0
      const kick = () => { if (c && c.bubble === bubble) bubble.enter() }
      if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(kick)
      else kick()
    }

    return {
      enter() { if (!c) start() },
      leave() { closeSheet(false); hideToast() },
      refresh() {},
      restart: start
    }
  }

  // ========== Thẻ Bếp: Thái ==========
  function makeThai(view) {
    const recipe = DATA.RECIPES[THAI_SAMPLE.recipeId]
    const step = recipe.steps.find(s => s.id === THAI_SAMPLE.stepId)
    const method = (DATA.METHOD_LABELS && step.method && DATA.METHOD_LABELS[step.method.correct]) || 'Thái lát'
    const stage = h('div', { class: 'mg-stage' })
    const wrap = h('div', { class: 'k-stage-wrap', dataset: { type: 'thai' } },
      h('div', { class: 'k-stage-bar' }, h('span', { class: 'k-stage-dish' }, recipe.name), h('span', { class: 'k-stage-method' }, method)),
      stage)
    const kitchen = h('section', { class: 'kitchen mau-kitchen-inner' }, h('div', { class: 'k-layer', dataset: { kind: 'stage' } }, wrap))
    const sim = h('div', { class: 'mau-sim mau-kitchen', 'data-testid': 'mau-kitchen' }, kitchen)
    const again = h('button', {
      class: 'g-btn g-btn--small mau-dock-again', type: 'button', 'data-testid': 'mau-thai-again',
      onclick: () => { sound('click'); reset() }
    }, svgBox(SVG_AGAIN, 'g-ico'), h('span', null, 'Thái lại'))
    const stampBtns = STAMP_SAMPLES.map(s => h('button', {
      class: ['mau-stamp-btn', 'grade-' + s.key], type: 'button', 'data-testid': 'mau-stamp-' + s.key,
      'aria-label': `Xem dấu ${gradeText(s.key)} (${s.score} điểm)`, title: gradeText(s.key),
      onclick: () => { sound('click'); previewStamp(s.score) }
    }, svgBox(stampSvg(s.key), 'mau-stamp-ico')))
    const dock = h('div', { class: 'mau-dock mau-dock--thai' },
      again,
      h('div', { class: 'mau-dock-group' }, h('span', { class: 'mau-dock-label' }, 'Xem dấu'), h('div', { class: 'mau-stamp-row' }, stampBtns)))
    view.append(chromeEl(), sim, dock)

    let card = null
    let handle = null
    let running = false
    let runId = 0

    function stopStage() {
      runId++
      if (card) { card.destroy(); card = null }
      if (handle) { try { handle.destroy() } catch { /* bỏ qua */ } handle = null }
      running = false
    }

    // Thẻ vào bước: "Bước 3/6 · Thái dưa leo!" có tay mẫu; chạm để vào bước (trang mẫu không tự chạy để kịp xem thẻ).
    function reset() {
      stopStage()
      clear(stage)
      stage.className = 'mg-stage'
      stage.removeAttribute('data-type')
      stage.removeAttribute('data-testid')
      const model = stepCardModel(step, { index: THAI_SAMPLE.index, total: THAI_SAMPLE.total, data: DATA, recipe })
      card = createStepCard(model, { full: true, autoMs: 0, reduced: reduced(), onStart: () => { card = null; startThai() } })
      wrap.appendChild(card.el)
    }

    function startThai() {
      const id = ++runId
      running = true
      handle = playStep(stage, step, {
        look: 2, data: DATA, recipe, vfx, reduced, app, rand: Math.random,
        stepIndex: THAI_SAMPLE.index, stepTotal: THAI_SAMPLE.total, stepGrades: THAI_SAMPLE.grades.slice()
      })
      bus.emit('mau.step.start', { step: step.id })
      handle.result.then(res => {
        if (id !== runId) return
        running = false
        if (!res) return
        bus.emit('mau.step.result', { step: step.id, score: res.score, grade: gradeKey(res.score) })
        showStamp(res.score)
      })
    }

    // Con dấu + Dì Sáu phản ứng trong lớp .mg-fx của sân khấu (như Đợt 1 ráp vào bếp).
    async function showStamp(score) {
      const fx = stage.querySelector('.mg-fx')
      if (!fx) return
      fx.querySelectorAll('.g-stamp, .g-disau-react').forEach(e => e.remove())
      const key = gradeKey(score)
      const el = createStamp({ score })
      fx.appendChild(el)
      fx.appendChild(createDiSauReact({ key, text: reactLine(key, Math.random, DATA), reduced: reduced() }))
      await playStamp(el, { vfx, sound, reduced, shake: stage, starTo: stage.querySelector('.g-dot.is-now') })
    }

    // Xem nhanh một hạng dấu: cần sân khấu đã dựng (đang ở thẻ bước thì vào bước luôn); bước đang chơi thì dừng lại.
    function previewStamp(score) {
      if (card) { card.start(); card = null }
      if (running && handle) { runId++; try { handle.destroy() } catch { /* bỏ qua */ } handle = null; running = false }
      const go = () => showStamp(score)
      if (stage.querySelector('.mg-fx')) go()
      else if (typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(go)
      else go()
    }

    return {
      enter() { reset() },
      leave() { stopStage() },
      refresh() { reset() }
    }
  }

  // ========== Thẻ Ra món ==========
  function makeReveal(view) {
    const recipe = DATA.RECIPES.banh_mi_op_la
    const labels = (DATA.BALANCE && DATA.BALANCE.gradeLabels) || {}
    const lvNames = (DATA.STRINGS && DATA.STRINGS.masteryLevels) || {}
    let grade = 'tuyet_hao'
    let flawless = true
    let levelUp = false
    let cur = null
    const host = h('div', { class: 'mau-sim mau-reveal-host', 'data-testid': 'mau-reveal-host' })
    const segGrade = seg(REVEAL_GRADES.map(g => ({ v: g, label: labels[g] || g, testid: 'mau-grade-' + g, cls: 'grade-' + g })), grade,
      v => { grade = v; show() }, { cls: 'mau-seg--grade', label: 'Hạng món' })
    const dock = h('div', { class: 'mau-dock mau-dock--reveal' },
      segGrade.el,
      h('div', { class: 'mau-dock-row' },
        toggleBtn({ label: 'Không tì vết', testid: 'mau-flawless', on: flawless, onChange: v => { flawless = v; show() } }),
        toggleBtn({ label: 'Lên cấp', testid: 'mau-levelup', on: levelUp, onChange: v => { levelUp = v; show() } }),
        h('button', { class: 'g-btn g-btn--small g-btn--gold mau-dock-again', type: 'button', 'data-testid': 'mau-reveal-again', onclick: () => { sound('click'); show() } },
          svgBox(SVG_AGAIN, 'g-ico'), h('span', null, 'Xem lại'))))
    view.append(chromeEl(), host, dock)

    function drop() { if (cur) { cur.destroy(); cur = null } }
    function show() {
      drop()
      clear(host)
      vfx.clear()
      const sample = REVEAL_SAMPLES[grade]
      // "Không tì vết" chỉ đi kèm hạng cao (như trong game: mọi bước đều đẹp); hạng thấp thì bỏ qua công tắc này
      const dish = { recipeId: recipe.id, grade, q: sample.q, flawless: flawless && FLAWLESS_GRADES.has(grade), mastery: levelUp ? { levelUp: true, levelAfter: 2 } : null }
      cur = createDishReveal({
        dish, recipe, name: recipe.name, comment: sample.comment,
        lvUpText: levelUp ? `Lên cấp thạo món: ${lvNames[2] || 'Quen tay'}` : '',
        data: DATA, reduced: reduced(), vfx, sound, onClose: rest
      })
      host.appendChild(cur.el)
      cur.play()
      bus.emit('mau.reveal', { grade, q: sample.q, flawless, levelUp })
    }
    // Chạm vào màn ra món = đóng (như trong game): hiện đĩa món đã ra quầy và nút xem lại.
    function rest() {
      const r = cur
      cur = null
      if (r) r.destroy()
      clear(host)
      host.appendChild(h('div', { class: 'mau-rest', 'data-testid': 'mau-reveal-rest' },
        h('div', { class: 'mau-rest-plate' }, svgBox(artV2(recipe.icon || 'mon_' + recipe.id), 'mau-rest-dish')),
        h('b', { class: 'mau-rest-title' }, 'Món đã ra quầy'),
        h('p', { class: 'mau-rest-text' }, 'Chọn hạng bên dưới hoặc bấm Xem lại để xem màn ra món lần nữa.')))
    }

    return {
      enter() { show() },
      leave() { drop(); clear(host) },
      refresh() { show() }
    }
  }

  // ========== Bảng Tùy chỉnh (công tắc) ==========
  let settingsLayer = null
  const swRows = {}
  function switchRow({ key, label, desc, svg, on, onChange }) {
    const row = h('button', {
      class: 'mau-switch-row', type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', 'data-testid': 'mau-sw-' + key,
      onclick: () => { const v = row.getAttribute('aria-checked') !== 'true'; row.setAttribute('aria-checked', v ? 'true' : 'false'); onChange(v); sound('click') }
    },
    svgBox(svg, 'mau-switch-ico'),
    h('span', { class: 'mau-switch-text' }, h('b', null, label), h('small', null, desc)),
    h('span', { class: 'mau-switch', 'aria-hidden': 'true' }, h('i', { class: 'mau-switch-knob' })))
    swRows[key] = row
    return row
  }
  function openSettings() {
    if (settingsLayer) return
    const close = h('button', { class: 'g-btn g-btn--go g-btn--block mau-settings-ok', type: 'button', 'data-testid': 'mau-settings-close', onclick: () => { sound('click'); closeSettings() } }, 'Xong')
    const panel = h('div', { class: 'mau-settings g-paper', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mau-settings-title' },
      h('div', { class: 'g-ribbon g-ribbon--gold mau-settings-ribbon', id: 'mau-settings-title' }, 'Tùy chỉnh'),
      switchRow({ key: 'reduce', label: 'Giảm chuyển động', desc: 'Tắt nảy, rung, hạt bay; hiện thẳng kết quả', svg: SVG_MOTION, on: st.reduce, onChange: setReduce }),
      switchRow({ key: 'sound', label: 'Âm thanh', desc: 'Tiếng con dấu, dao thái, lấp lánh', svg: SVG_SOUND, on: st.sound, onChange: setSound }),
      switchRow({ key: 'low', label: 'Khung thấp', desc: `Panel chỉ cao khoảng ${LOW_PANEL_PX} như màn 360×600 trong ca`, svg: SVG_LOW, on: st.low, onChange: setLow }),
      h('p', { class: 'mau-settings-note' }, 'Phòng mẫu chỉ để duyệt giao diện: không lưu gì vào bản lưu của game, chơi thử thoải mái.'),
      close)
    settingsLayer = h('div', { class: 'mau-sheet-layer', 'data-testid': 'mau-settings-layer' }, panel)
    settingsLayer.addEventListener('pointerdown', e => { if (e.target === settingsLayer) closeSettings() })
    overlay.appendChild(settingsLayer)
    gear.setAttribute('aria-expanded', 'true')
    try { close.focus({ preventScroll: true }) } catch { /* bỏ qua */ }
  }
  function closeSettings() {
    if (!settingsLayer) return
    settingsLayer.remove()
    settingsLayer = null
    for (const k of Object.keys(swRows)) delete swRows[k]
    gear.setAttribute('aria-expanded', 'false')
    try { gear.focus({ preventScroll: true }) } catch { /* bỏ qua */ }
  }
  gear.addEventListener('click', () => { sound('click'); if (settingsLayer) closeSettings(); else openSettings() })
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && settingsLayer) closeSettings() })

  function paintGear() {
    const n = (st.reduce ? 1 : 0) + (st.sound ? 0 : 1) + (st.low ? 1 : 0)
    gear.dataset.on = String(n)
    frame.classList.toggle('is-low', st.low)
    frame.style.setProperty('--mau-low-h', LOW_PANEL_PX + 'px')
  }
  function syncRow(key, on) { if (swRows[key]) swRows[key].setAttribute('aria-checked', on ? 'true' : 'false') }

  function setReduce(on) {
    st.reduce = !!on
    doc.documentElement.classList.toggle('reduce-motion', st.reduce)
    syncRow('reduce', st.reduce)
    paintGear()
    vfx.clear()
    // dựng lại thẻ đang mở để thành phần nhận chế độ mới (hoạt ảnh JS hỏi isReduced lúc dựng)
    if (current && ctrls[current] && ctrls[current].refresh) ctrls[current].refresh()
    bus.emit('mau.setting', { reduce: st.reduce })
  }
  function setSound(on) {
    st.sound = !!on
    syncRow('sound', st.sound)
    paintGear()
    if (st.sound) { try { audio.unlock() } catch { /* bỏ qua */ } }
    bus.emit('mau.setting', { sound: st.sound })
  }
  function setLow(on) {
    st.low = !!on
    syncRow('low', st.low)
    paintGear()
    vfx.clear()
    if (current && ctrls[current] && ctrls[current].refresh) ctrls[current].refresh()
    bus.emit('mau.setting', { low: st.low })
  }

  // ----- Khởi động -----
  doc.documentElement.classList.toggle('reduce-motion', st.reduce)
  paintGear()
  gear.setAttribute('aria-expanded', 'false')
  setTab(st.tab, { force: true })

  const api = { app, vfx, bus, st, log, setTab, setReduce, setSound, setLow, openSettings, closeSettings, ready: true }
  win.__mau = api
  return api
}

if (typeof document !== 'undefined' && document.getElementById && document.getElementById('mau-screen')) {
  boot(document)
}
