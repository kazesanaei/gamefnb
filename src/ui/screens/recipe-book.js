// Màn Sổ công thức (M3): mọi món (đã có / Chợ Công Thức / món sự kiện / bóng mờ Chặng 2; M4: công thức hiếm — mảnh đã
// gom, món nền còn thiếu, nấu thử khi đủ mảnh). Mỗi món: hình, giá, giá vốn,
// số lần nấu, điểm cao nhất, cấp thạo món và mốc kế, huy hiệu "Không tì vết", nguồn. Chạm món để xem nguyên liệu và
// các bước (không lộ bẫy). Thẻ "Sổ từ vùng miền": cặp từ Nam – Bắc khách hay nói.
// Mở từ màn Chuẩn bị (open-recipe-book). params: { tab: 'mon' | 'tu', recipeId } mở sẵn thẻ / chi tiết món.
//
// M5 Đợt 3 (gói M-D, bản 0.5.2) — vẽ lại thành cuốn sổ bìa da:
// - Thân màn là cuốn sổ mở (.bk-book): khung đủ rộng (≥ 300px bên trong, tức khung 390px trở lên) thì mở HAI trang, mỗi
//   món là một "trang đôi" (.bk-spread): trang trái = đĩa món to, tên, nguồn, huy hiệu thạo món (huy_hieu_nen + sao),
//   dấu "Không tì vết" (cả trang trái là nút xem công thức); trang phải = viên Bán / Vốn / Lãi, số lần nấu, điểm cao
//   nhất, thanh lên cấp. Khung hẹp (375 / 360 / 320px) gập còn MỘT trang (CSS container query, không cần JS).
// - Món chưa có: đĩa mờ có ổ khóa; món Chặng sau: bóng mờ một màu (metaArt silhouette) có ổ khóa.
// - Món hiếm ★: mảnh công thức là 3 tờ giấy (đã gom / bóng mờ), hàng hiếm mỗi phần là ô có hình; dòng giá vốn hàng hiếm
//   (M4) chạy ngang dưới trang đôi.
// - Chi tiết món: nguyên liệu là ô hình nhỏ có nhãn, các bước là huy hiệu thao tác như Thớt ở Bếp 0.5.0 (stepBadge
//   của kitchen.js — chỉ đọc), bước quyết định có sao đỏ.
// - Sổ từ vùng miền: trang từ điển, mỗi cặp từ có hình nhỏ (khi có hình hợp) và hai viên Nam = Bắc.
// - Hoạt ảnh: chỉ khi bấm đổi thẻ (lật trang ngắn, một lần); giảm chuyển động thì không lật. Vẽ lại không phát lại.
// Giữ: export RECIPE_BOOK_SVG, mọi testid / data-* / chữ mà e2e và tour bám (docs/tham-khao/m5-ban-do-ma.md mục 9.3).
import { h, svgBox } from '../dom.js'
import { icon, art, prop, SCENE_ICONS } from '../art.js'
import { metaArt } from '../art/meta.js'
import { formatVND } from '../format.js'
import { recipeBook, recipeDetail, dialectBook } from '../../core/recipe-book.js'
import { screenHead, progressBar } from '../components/meta-ui.js'
import { stepBadge } from './kitchen.js'
import { isReduced } from '../motion.js'

// Biểu tượng Sổ công thức (cuốn sổ bìa da có cái muỗng — hình lối vào so_cong_thuc của bộ hình meta, cel-shading).
// Giữ tên export cho nơi khác dùng.
export const RECIPE_BOOK_SVG = metaArt('so_cong_thuc')

// Ổ khóa nhỏ (món chưa có), viền mực.
const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><g stroke="#3a2618" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M7.5 11V8.2a4.5 4.5 0 0 1 9 0V11" fill="none" stroke-width="2.6"/>' +
  '<rect x="4.5" y="10.5" width="15" height="11" rx="3" fill="#f7b928"/>' +
  '<path d="M16.5 12.5v7" stroke="#a87404" stroke-width="2" opacity=".55"/>' +
  '<circle cx="12" cy="15.6" r="1.7" fill="#3a2618" stroke="none"/></g></svg>'

// Hai bong bóng lời nói (thẻ Sổ từ vùng miền; cặp từ không có hình riêng), viền mực, tự vẽ.
const TALK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
  '<ellipse cx="32" cy="58" rx="22" ry="3.5" fill="#3a2618" opacity=".15" stroke="none"/>' +
  '<path d="M6 14a8 8 0 0 1 8-8h18a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H18l-8 7 1-7.6A8 8 0 0 1 6 22z" fill="#ff8a6c"/>' +
  '<ellipse cx="15" cy="12" rx="4" ry="2" fill="#fff" opacity=".5" stroke="none"/>' +
  '<g fill="#fff" stroke="none"><circle cx="16" cy="18" r="2.4"/><circle cx="23" cy="18" r="2.4"/><circle cx="30" cy="18" r="2.4"/></g>' +
  '<path d="M58 34a8 8 0 0 0-8-8H32a8 8 0 0 0-8 8v8a8 8 0 0 0 8 8h14l8 7-1-7.6A8 8 0 0 0 58 42z" fill="#8fd0ff"/>' +
  '<path d="M55 44a6 6 0 0 1-5 4H34" fill="none" stroke="#22679a" stroke-width="2" opacity=".45"/>' +
  '<g fill="#22679a" stroke="none"><circle cx="34" cy="38" r="2.4"/><circle cx="41" cy="38" r="2.4"/><circle cx="48" cy="38" r="2.4"/></g></g></svg>'

// Hình huy hiệu thao tác vẽ riêng của Bếp (kitchen.js không export bảng này): ngọn lửa (Canh lửa), giọt nước (Rửa),
// muỗng rắc (Nêm). Cùng nét với Thớt ở Bếp 0.5.0.
const STEP_GLYPHS = Object.freeze({
  flame: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="32" cy="58" rx="14" ry="3.5" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<path d="M32 5c3 11 17 16 17 32a17 17 0 0 1-34 0c0-9 4-14 9-18 1 5 3 8 6 9-2-9 0-16 2-23z" fill="#f28a1e"/>' +
    '<path d="M44 36a13 13 0 0 1-9 17c6-4 7-11 5-17z" fill="#d4620a" stroke="none"/>' +
    '<path d="M32 30c2 5 8 8 8 15a8 8 0 0 1-16 0c0-5 3-8 5-10 1 3 2 4 3 4-1-4 0-7 0-9z" fill="#ffd23f" stroke-width="2"/>' +
    '<ellipse cx="24" cy="31" rx="2.6" ry="6" fill="#fff" opacity=".5" stroke="none" transform="rotate(20 24 31)"/></g></svg>',
  drop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="32" cy="59" rx="13" ry="3.2" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<path d="M32 5C25 19 13 29 13 39a19 19 0 0 0 38 0C51 29 39 19 32 5z" fill="#4aa3df"/>' +
    '<path d="M47 40a15 15 0 0 1-15 15c9-3 13-9 13-15z" fill="#22679a" stroke="none" opacity=".55"/>' +
    '<path d="M22 40a10 10 0 0 0 7 10" fill="none" stroke="#fff" stroke-width="3.2" opacity=".75"/>' +
    '<ellipse cx="25" cy="27" rx="3" ry="5.5" fill="#fff" opacity=".55" stroke="none" transform="rotate(25 25 27)"/></g></svg>',
  spoon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
    '<ellipse cx="34" cy="59" rx="15" ry="3.2" fill="#3a2618" opacity=".15" stroke="none"/>' +
    '<rect x="3" y="16" width="27" height="8" rx="4" fill="#d99a4c" transform="rotate(28 16 20)"/>' +
    '<ellipse cx="40" cy="29" rx="14" ry="9.5" fill="#dfe7ec" transform="rotate(28 40 29)"/>' +
    '<ellipse cx="41.5" cy="28" rx="9" ry="5.5" fill="#fff4dc" stroke-width="2" transform="rotate(28 41.5 28)"/>' +
    '<ellipse cx="35" cy="24" rx="4" ry="1.8" fill="#fff" opacity=".7" stroke="none" transform="rotate(28 35 24)"/>' +
    '<g fill="#fff4dc" stroke-width="2"><circle cx="47" cy="45" r="3"/><circle cx="40" cy="51" r="2.6"/><circle cx="51" cy="54" r="2.2"/></g></g></svg>'
})

// Hình nhỏ cho cặp từ vùng miền (id SYNONYMS → hình có sẵn); không có thì hai bong bóng lời nói.
const DIALECT_ART = Object.freeze({
  tra_tac: () => icon('mon_tra_tac'), ly: () => icon('ly'), o_banh_mi: () => icon('banh_mi'),
  ca_phe_sua_da: () => icon('mon_ca_phe_sua_da'), chien: () => icon('chao_chong_dinh'), hanh_la: () => icon('hanh_la'),
  khong_hanh: () => icon('hanh_la'), khong_da: () => icon('da'), dau_phong: () => icon('dau_phong'),
  hot_ga: () => icon('trung_ga'), muong: () => icon('muong_khuay'), tien_thoi: () => SCENE_ICONS.dong_xu || metaArt('xu'),
  mac: () => metaArt('xu'), lat: () => icon('muoi'), trai: () => icon('tac'), dia: () => prop('dia_lon') || ''
})

// Hình huy hiệu thao tác của một bước (theo stepBadge của Bếp).
function stepArt(def) {
  let b = null
  try { b = stepBadge(def) } catch { b = null }
  if (!b) return icon('fallback')
  if (b.kind === 'glyph') return STEP_GLYPHS[b.id] || icon('fallback')
  if (b.kind === 'prop') return prop(b.id) || icon('fallback')
  return b.state ? art(b.id, b.state) : icon(b.id)
}

// Số sao của thạo món ở chặng hiện tại (số mốc trong BALANCE.masteryLevels, tối thiểu 3).
function starCount(data) {
  const lv = data && data.BALANCE && data.BALANCE.masteryLevels
  return Math.max(3, Array.isArray(lv) ? lv.length : 3)
}

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS
    const el = h('section', { class: 'meta-screen book-screen', testid: 'screen-recipe-book' })
    root.appendChild(el)
    let tab = params.tab === 'tu' ? 'tu' : 'mon'
    let destroyed = false
    let turnNext = false

    function render() {
      if (destroyed) return
      const book = recipeBook(app.state, app.ctx)
      el.textContent = ''
      el.appendChild(screenHead(app, {
        title: S.screens.recipeBook, backLabel: '‹ Chuẩn bị', help: true,
        sub: `Đã có ${book.owned}/${book.total} món · chạm món xem cách làm`
      }))
      el.appendChild(h('nav', { class: 'seg-tabs book-tabs', role: 'tablist' },
        tabBtn('mon', 'Món ăn', 'recipe-book-tab-mon', icon('mon_banh_mi_op_la')),
        tabBtn('tu', S.screens.dialectBook, 'recipe-book-tab-tu', TALK_SVG)))
      const body = h('div', { class: 'meta-body book-body' })
      el.appendChild(body)
      // cuốn sổ bìa da: ruy băng đánh dấu + giấy (hai trang / một trang theo bề ngang)
      const pages = h('div', { class: ['bk-pages', tab === 'tu' ? 'is-dict' : ''] })
      const cover = h('div', { class: ['bk-book', turnNext ? 'is-turn' : ''], dataset: { tab } },
        h('span', { class: 'bk-ribbon', 'aria-hidden': 'true' }), pages)
      turnNext = false
      body.appendChild(cover)
      if (tab === 'tu') renderDialect(pages)
      else {
        pages.appendChild(h('span', { class: 'bk-spine', 'aria-hidden': 'true' }))
        renderRecipes(pages, book)
      }
    }

    function tabBtn(id, label, testid, svg) {
      return h('button', {
        class: ['seg-tab', 'bk-tab', tab === id ? 'active' : ''], type: 'button', role: 'tab', testid,
        'aria-selected': String(tab === id),
        onclick: () => {
          if (tab === id) return
          tab = id
          app.sound('paper')
          // lật trang một lần khi đổi thẻ (sự kiện bấm), không lật khi giảm chuyển động
          turnNext = !isReduced(app)
          render()
          root.scrollTop = 0
        }
      }, svgBox(svg, 'bk-tab-ico'), h('span', { class: 'bk-tab-lbl' }, label))
    }

    function renderRecipes(pages, book) {
      const groups = [
        { id: 'owned', title: 'Món đang bán', art: metaArt('dau_tick'), list: book.entries.filter(e => e.status === 'owned') },
        { id: 'locked', title: 'Chưa có', art: metaArt('cho_cong_thuc'), list: book.entries.filter(e => e.status === 'shop' || e.status === 'event') },
        // M4: công thức hiếm chưa mở (gom mảnh, nấu thử)
        { id: 'hiem', title: (S.sources && S.sources.hiem) || 'Công thức hiếm', star: true, art: metaArt('manh_cong_thuc'), list: book.entries.filter(e => e.status === 'hiem') },
        { id: 'teaser', title: 'Chặng sau', art: metaArt('kho_hiem'), list: book.entries.filter(e => e.status === 'teaser') }
      ]
      for (const g of groups) {
        if (!g.list.length) continue
        const sec = h('section', { class: ['bk-group', 'bk-group-' + g.id] },
          h('h2', { class: 'bk-section' },
            svgBox(g.art, 'bk-section-ico'),
            h('span', { class: 'bk-section-lbl' }, g.title, g.star ? h('span', { class: 'rare-star' }, ' ★') : null),
            h('span', { class: 'bk-section-num' }, String(g.list.length))))
        if (g.id === 'teaser') {
          const note = (g.list[0] && g.list[0].note) || 'mở ở chặng sau'
          sec.appendChild(h('p', { class: 'bk-group-note' }, svgBox(LOCK_SVG, 'bk-note-lock'), `Sắp có: ${note}`))
          sec.appendChild(h('div', { class: 'book-list bk-teasers' }, g.list.map(teaserTile)))
        } else {
          sec.appendChild(h('div', { class: 'book-list' }, g.list.map(entryCard)))
        }
        pages.appendChild(sec)
      }
    }

    // Đĩa món: hình món to trên đĩa giấy tròn; món chưa có thì mờ + ổ khóa; món hiếm có sao ★.
    function plate(e, { big = true } = {}) {
      return h('span', { class: ['bk-plate', big ? '' : 'is-small'] },
        svgBox(icon(e.icon), 'dish-icon book-icon bk-dish'),
        e.source === 'hiem' ? h('span', { class: 'bk-plate-star', 'aria-hidden': 'true' }, '★') : null,
        e.locked ? svgBox(LOCK_SVG, 'bk-plate-lock') : null)
    }

    // Huy hiệu thạo món: khiên huy_hieu_nen có số cấp + hàng sao (sao đầy = cấp hiện tại).
    function masteryBadge(e) {
      const m = e.mastery
      const n = starCount(app.data)
      return h('span', { class: 'bk-mastery', role: 'img', 'aria-label': `${S.labels.mastery}: ${m.name} (cấp ${m.level})`, dataset: { level: m.level } },
        h('span', { class: 'bk-badge' }, svgBox(metaArt('huy_hieu_nen'), 'bk-badge-art'), h('b', { class: 'bk-badge-num', 'aria-hidden': 'true' }, String(m.level))),
        h('span', { class: 'bk-mastery-text', 'aria-hidden': 'true' },
          h('b', { class: 'bk-level', testid: 'book-level-' + e.id }, m.name),
          h('span', { class: 'bk-stars' }, Array.from({ length: n }, (_, i) => svgBox(icon('sao'), ['bk-star', i < m.level ? 'on' : 'off'].join(' '))))))
    }

    // Viên tiền: hình + nhãn ngắn + số (Baloo).
    function moneyChip(kind, short, label, value, svg) {
      return h('span', { class: ['bk-chip', 'bk-chip-' + kind], title: `${label}: ${value}` },
        svgBox(svg, 'bk-chip-ico'), h('span', { class: 'bk-chip-lbl' }, short), h('b', null, value))
    }

    function moneyRow(e) {
      return h('div', { class: 'book-money' },
        moneyChip('price', 'Bán', S.labels.price, formatVND(e.price), SCENE_ICONS.dong_xu || metaArt('xu')),
        moneyChip('cost', 'Vốn', S.labels.cost, formatVND(e.cost), icon('ro')),
        moneyChip('profit', 'Lãi', 'Lãi mỗi phần', formatVND(e.profit), metaArt('xu')))
    }

    function entryCard(e) {
      const m = e.mastery
      const props = {
        class: ['book-card', 'bk-spread', 'st-' + e.status, e.locked ? 'is-locked' : '', e.source === 'hiem' ? 'is-rare' : ''], testid: 'book-recipe-' + e.id,
        dataset: { status: e.status, cooks: e.cooks, best: e.best, level: m ? m.level : 0, flawless: String(e.flawlessBadge) }
      }
      // trang trái: đĩa món, tên, nguồn, dấu "Không tì vết", huy hiệu thạo món — cả trang là nút xem công thức
      const left = h('button', {
        class: 'book-card-btn bk-page bk-left', type: 'button', testid: 'book-open-' + e.id, 'aria-label': 'Xem công thức ' + e.name,
        onclick: () => openDetail(e)
      },
      plate(e),
      h('span', { class: 'book-card-title bk-title' },
        h('b', { class: 'bk-name' }, e.name, e.source === 'hiem' ? h('span', { class: 'rare-star', 'aria-label': 'món hiếm' }, ' ★') : null),
        h('span', { class: 'book-tags' },
          h('span', { class: ['book-source', 'src-' + e.source] }, e.sourceLabel),
          e.flawlessBadge ? h('span', { class: 'book-flawless', testid: 'book-flawless-' + e.id, title: S.flawless }, svgBox(icon('sao'), 'bk-flawless-ico'), S.flawless) : null),
        m ? masteryBadge(e) : null),
      h('span', { class: 'bk-open', 'aria-hidden': 'true' }, h('span', { class: 'bk-open-lbl' }, 'Xem cách làm'), h('b', null, '›')))

      // trang phải: viên tiền + số liệu / tiến độ
      const right = h('div', { class: 'bk-page bk-right' }, moneyRow(e))
      if (m) {
        right.appendChild(h('div', { class: 'book-stats' },
          h('span', { class: 'bk-stat', title: S.labels.cooks }, svgBox(icon('chao_chong_dinh'), 'bk-stat-ico'),
            h('span', null, 'Nấu '), h('b', { testid: 'book-cooks-' + e.id }, String(e.cooks)), h('span', null, ' lần')),
          h('span', { class: 'bk-stat', title: S.labels.best }, svgBox(metaArt('cup'), 'bk-stat-ico'),
            h('span', null, 'Cao nhất '), h('b', { testid: 'book-best-' + e.id }, e.cooks ? String(e.best) : '—'))))
        right.appendChild(h('div', { class: 'book-level bk-next' },
          m.next ? progressBar(m.goodCooks, m.next.target, { label: `${S.labels.mastery} ${e.name}` }) : progressBar(1, 1, { label: `${S.labels.mastery} ${e.name}` }),
          h('span', { class: 'bk-next-text' }, m.next ? `còn ${m.next.need} lần Ngon để lên ${m.next.name}` : 'đã lên cấp cao nhất của chặng')))
      } else if (e.status === 'hiem' && e.rare) {
        right.appendChild(rareBlock(e))
      } else {
        // món chưa có: cách có món
        const where = e.status === 'shop'
          ? [svgBox(metaArt('cho_cong_thuc'), 'bk-where-ico'), h('span', null, e.note), e.shopPrice ? h('b', { class: 'bk-where-price' }, formatVND(e.shopPrice)) : null]
          : [svgBox(metaArt('su_kien'), 'bk-where-ico'), h('span', null, e.note)]
        right.appendChild(h('p', { class: 'book-note bk-where' }, where))
      }
      const card = h('article', props, left, right)
      // M4: món hiếm: giá vốn có phần hàng hiếm quy đổi (lấy từ kho, trong ca không trừ Tiền quán) — dòng ngang dưới trang đôi
      if (e.rareCost > 0) {
        card.appendChild(h('p', { class: 'book-rare-cost', testid: 'book-hiem-cost-' + e.id },
          h('span', { class: 'rare-star', 'aria-hidden': 'true' }, '★ '),
          `Giá vốn gồm ${formatVND(e.rareCost)} hàng hiếm quy đổi (lấy từ kho, không trừ Tiền quán): trong ca chỉ trừ ${formatVND(Math.max(0, e.cost - e.rareCost))} mỗi phần.`))
      }
      return card
    }

    // M4: "Mảnh 2/3 · Cần Bánh tráng trộn"; đủ mảnh → nấu thử (thử lại tới khi đạt hạng Được)
    function rareBlock(e) {
      const r = e.rare
      const need = Math.max(1, Number(r.need) || 3)
      const pieces = Array.from({ length: need }, (_, i) => svgBox(i < r.n ? metaArt('manh_cong_thuc') : metaArt('manh_cong_thuc', { silhouette: true }),
        ['bk-frag', i < r.n ? 'on' : 'off'].join(' ')))
      const INGS = app.data.INGREDIENTS || {}
      return h('div', { class: 'book-rare', testid: 'book-rare-' + e.id, dataset: { n: String(r.n), ready: String(!!r.ready) } },
        h('div', { class: 'bk-frags', role: 'img', 'aria-label': `Mảnh công thức ${r.n}/${need}` }, pieces),
        h('p', { class: 'book-note bk-frag-text' }, h('b', null, `Mảnh ${r.n}/${need}`),
          r.missing && r.missing.length ? h('span', null, ` · Cần ${r.missing.join(', ')}`) : null,
          r.ready ? h('span', null, ' · Đủ mảnh, nấu thử để mở') : null),
        r.ings && r.ings.length ? h('div', { class: 'bk-rare-ings', role: 'list', 'aria-label': 'Mỗi phần dùng: ' + r.ings.map(x => `${x.n} ${x.name}`).join(', ') },
          h('span', { class: 'bk-rare-lbl', 'aria-hidden': 'true' }, 'Mỗi phần:'),
          r.ings.map(x => h('span', { class: 'bk-ing-mini', role: 'listitem', title: `${x.n} ${x.name}` },
            svgBox(icon((INGS[x.id] && INGS[x.id].icon) || x.id), 'bk-ing-mini-ico'), h('b', null, '×' + x.n), h('span', null, x.name)))) : null,
        r.ready ? h('button', {
          class: 'btn btn-primary btn-small', type: 'button', testid: 'book-taste-' + e.id,
          onclick: () => { app.sound('click'); app.go('tasting', { recipeId: e.id, back: 'recipe-book' }) }
        }, 'Nấu thử để mở món') : null)
    }

    // Món Chặng sau: bóng mờ một màu + ổ khóa, chỉ tên.
    function teaserTile(e) {
      const sil = metaArt(e.icon, { silhouette: true }) || icon(e.icon)
      return h('article', {
        class: ['book-card', 'bk-teaser', 'st-teaser', 'is-locked'], testid: 'book-recipe-' + e.id, role: 'img',
        'aria-label': `${e.name}: sắp có, ${e.note || 'mở ở chặng sau'}`,
        dataset: { status: e.status, cooks: e.cooks, best: e.best, level: 0, flawless: 'false' }
      },
      h('span', { class: 'bk-plate is-small is-shadow' }, svgBox(sil, 'dish-icon book-icon bk-dish'), svgBox(LOCK_SVG, 'bk-plate-lock')),
      h('b', { class: 'bk-teaser-name' }, e.name))
    }

    function openDetail(e) {
      const d = recipeDetail(app.state, e.id, app.ctx)
      if (!d) return
      const raw = (app.data.RECIPES && app.data.RECIPES[d.id]) || {}
      const defs = new Map((raw.steps || []).map(s => [s.id, s]))
      app.sound('paper')
      app.modal({
        testid: 'recipe-detail', className: 'book-detail', dismissible: true, blocking: false,
        render: close => h('div', { class: ['book-detail-body', 'bk-detail', e.source === 'hiem' ? 'is-rare' : ''], dataset: { recipeId: d.id } },
          h('div', { class: 'book-detail-head' },
            h('span', { class: 'bk-plate is-detail' }, svgBox(icon(d.icon), 'dish-icon bk-dish'),
              e.source === 'hiem' ? h('span', { class: 'bk-plate-star', 'aria-hidden': 'true' }, '★') : null),
            h('div', { class: 'bk-detail-title' },
              h('h2', { class: 'modal-title' }, d.name, e.source === 'hiem' ? h('span', { class: 'rare-star', 'aria-label': 'món hiếm' }, ' ★') : null),
              h('span', { class: ['book-source', 'src-' + e.source] }, e.sourceLabel),
              e.mastery ? masteryBadge(e) : null)),
          d.desc ? h('p', { class: 'bk-desc' }, d.desc) : null,
          moneyRow({ price: d.price, cost: d.cost, profit: d.price - d.cost }),
          h('h3', { class: 'book-h3' }, svgBox(icon('ro'), 'bk-h3-ico'), `${S.labels.ingredients} (${d.ingredients.length})`),
          h('ul', { class: 'book-ings' }, d.ingredients.map(i => h('li', {
            class: ['bk-ing', 'role-' + i.role], testid: 'recipe-detail-ing-' + i.id,
            title: i.role === 'tuy_chon' && i.when.length ? `${i.name}: khi khách dặn ${i.when.join(', ')}` : `${i.name}: ${i.roleLabel}`
          },
          h('span', { class: 'bk-ing-slot' }, svgBox(icon(i.icon), 'book-ing-icon'), i.qty > 1 ? h('b', { class: 'bk-ing-qty' }, '×' + i.qty) : null),
          h('span', { class: 'bk-ing-name' }, i.name),
          h('small', { class: 'bk-ing-role' }, i.role === 'tuy_chon' && i.when.length ? `khi dặn ${i.when.join(', ')}` : i.roleLabel)))),
          h('h3', { class: 'book-h3' }, svgBox(icon('thot'), 'bk-h3-ico'), `${S.labels.steps} (${d.steps.length})`),
          h('ol', { class: 'book-steps' }, d.steps.map((s, k) => h('li', { class: ['bk-step', s.critical ? 'is-critical' : ''], testid: 'recipe-detail-step-' + s.id },
            h('span', { class: 'bk-step-badge' }, svgBox(stepArt(defs.get(s.id) || s), 'bk-step-ico'),
              h('b', { class: 'bk-step-no', 'aria-hidden': 'true' }, String(k + 1)),
              s.critical ? h('span', { class: 'bk-step-crit', 'aria-hidden': 'true' }, '★') : null),
            h('span', { class: 'bk-step-text' },
              h('span', { class: 'bk-step-label' }, s.label),
              h('small', { class: 'muted' }, [s.typeName !== s.label ? s.typeName : '', s.chooseMethod ? 'chọn cách sơ chế' : '', s.critical ? 'bước quyết định' : '']
                .filter(Boolean).join(' · ') || 'bắt buộc, làm đầu tiên'))))),
          d.notes.length ? h('h3', { class: 'book-h3' }, svgBox(SCENE_ICONS.khau_order || icon('fallback'), 'bk-h3-ico'), 'Khách hay dặn') : null,
          d.notes.length ? h('p', { class: 'book-notes' }, d.notes.map(n => h('span', { class: 'bk-note-chip' }, n.label + (n.surcharge ? ` (+${formatVND(n.surcharge)})` : '')))) : null,
          h('p', { class: 'bk-warn' }, svgBox(metaArt('kiem_tra_attp'), 'bk-warn-ico'), h('span', null, 'Kệ ở bếp còn vài nguyên liệu dễ nhầm, chọn cho đúng nha.')),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-primary', type: 'button', testid: 'recipe-detail-close', onclick: () => close(true) }, 'Đóng')))
      })
    }

    function renderDialect(pages) {
      const words = dialectBook(app.ctx)
      pages.appendChild(h('p', { class: 'book-dialect-intro' }, svgBox(TALK_SVG, 'bk-dict-ico'),
        h('span', null, 'Khách giọng Nam và giọng Bắc gọi cùng một thứ bằng từ khác nhau. Nghe ra đúng từ là ghi phiếu đúng.')))
      pages.appendChild(h('div', { class: 'dialect-head', 'aria-hidden': 'true' }, h('span', { class: 'is-nam' }, 'Giọng Nam'), h('span', { class: 'is-bac' }, 'Giọng Bắc')))
      pages.appendChild(h('ul', { class: 'dialect-list', testid: 'dialect-list' }, words.map(w => {
        const pic = DIALECT_ART[w.id] ? DIALECT_ART[w.id]() : ''
        return h('li', { class: 'dialect-item', testid: 'dialect-' + w.id },
          svgBox(pic || TALK_SVG, ['dialect-ico', pic ? '' : 'is-talk'].join(' ')),
          h('div', { class: 'dialect-main' },
            h('div', { class: 'dialect-pair' },
              h('b', { class: 'dialect-nam' }, w.nam),
              h('span', { class: 'dialect-eq', 'aria-label': 'cũng là' }, '='),
              h('b', { class: 'dialect-bac' }, w.bac)),
            w.meaning ? h('small', { class: 'muted' }, w.meaning) : null))
      })))
    }

    render()
    if (params.recipeId) {
      const e = recipeBook(app.state, app.ctx).entries.find(x => x.id === params.recipeId && x.status !== 'teaser')
      if (e) openDetail(e)
    }
    return { unmount() { destroyed = true } }
  }
}
