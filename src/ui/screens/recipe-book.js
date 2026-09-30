// Màn Sổ công thức (M3): mọi món (đã có / Chợ Công Thức / món sự kiện / bóng mờ Chặng 2; M4: công thức hiếm — mảnh đã
// gom, món nền còn thiếu, nấu thử khi đủ mảnh). Mỗi món: hình, giá, giá vốn,
// số lần nấu, điểm cao nhất, cấp thạo món và mốc kế, huy hiệu "Không tì vết", nguồn. Chạm món để xem nguyên liệu và
// các bước (không lộ bẫy). Thẻ "Sổ từ vùng miền": cặp từ Nam – Bắc khách hay nói.
// Mở từ màn Chuẩn bị (open-recipe-book). params: { tab: 'mon' | 'tu', recipeId } mở sẵn thẻ / chi tiết món.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { formatVND } from '../format.js'
import { recipeBook, recipeDetail, dialectBook } from '../../core/recipe-book.js'
import { screenHead, progressBar } from '../components/meta-ui.js'

// Biểu tượng Sổ công thức (cuốn sách có hình cái chảo), dùng cho lưới lối vào ở màn Chuẩn bị.
export const RECIPE_BOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">' +
  '<path d="M6 14 C16 9 26 10 32 16 C38 10 48 9 58 14 V54 C48 49 38 50 32 56 C26 50 16 49 6 54Z" fill="#fff8e6"/>' +
  '<path d="M32 16 V56" />' +
  '<path d="M6 14 C16 9 26 10 32 16 V56 C26 50 16 49 6 54Z" fill="#f3c97a"/>' +
  '<circle cx="46" cy="30" r="7" fill="#8e8e8e"/><path d="M52 34 L56 40" stroke-width="3.5"/>' +
  '<path d="M12 24 H26 M12 32 H26 M12 40 H22" stroke="#b9472f" stroke-width="2.5"/></g></svg>'

export default {
  mount(root, app, params = {}) {
    const S = app.data.STRINGS
    const el = h('section', { class: 'meta-screen book-screen', testid: 'screen-recipe-book' })
    root.appendChild(el)
    let tab = params.tab === 'tu' ? 'tu' : 'mon'
    let destroyed = false

    function render() {
      if (destroyed) return
      const book = recipeBook(app.state, app.ctx)
      el.textContent = ''
      el.appendChild(screenHead(app, {
        title: S.screens.recipeBook, backLabel: '‹ Chuẩn bị',
        sub: `Đã có ${book.owned}/${book.total} món · chạm món để xem nguyên liệu và các bước`
      }))
      el.appendChild(h('nav', { class: 'seg-tabs book-tabs', role: 'tablist' },
        tabBtn('mon', 'Món ăn', 'recipe-book-tab-mon'),
        tabBtn('tu', S.screens.dialectBook, 'recipe-book-tab-tu')))
      const body = h('div', { class: 'meta-body book-body' })
      el.appendChild(body)
      if (tab === 'tu') renderDialect(body)
      else renderRecipes(body, book)
    }

    function tabBtn(id, label, testid) {
      return h('button', {
        class: ['seg-tab', tab === id ? 'active' : ''], type: 'button', role: 'tab', testid,
        'aria-selected': String(tab === id),
        onclick: () => { if (tab !== id) { tab = id; app.sound('click'); render(); root.scrollTop = 0 } }
      }, label)
    }

    function renderRecipes(body, book) {
      const groups = [
        ['Món đang bán', book.entries.filter(e => e.status === 'owned')],
        ['Chưa có', book.entries.filter(e => e.status === 'shop' || e.status === 'event')],
        // M4: công thức hiếm chưa mở (gom mảnh, nấu thử)
        [(S.sources && S.sources.hiem) || 'Công thức hiếm', book.entries.filter(e => e.status === 'hiem')],
        ['Chặng sau', book.entries.filter(e => e.status === 'teaser')]
      ]
      for (const [title, list] of groups) {
        if (!list.length) continue
        body.appendChild(h('h2', { class: 'meta-section' }, title))
        const grid = h('div', { class: 'book-list' })
        for (const e of list) grid.appendChild(entryCard(e))
        body.appendChild(grid)
      }
    }

    function entryCard(e) {
      const teaser = e.status === 'teaser'
      const m = e.mastery
      const props = {
        class: ['book-card', 'st-' + e.status, e.locked ? 'is-locked' : ''], testid: 'book-recipe-' + e.id,
        dataset: { status: e.status, cooks: e.cooks, best: e.best, level: m ? m.level : 0, flawless: String(e.flawlessBadge) }
      }
      const head = h('div', { class: 'book-card-head' },
        svgBox(icon(e.icon), 'dish-icon book-icon'),
        h('div', { class: 'book-card-title' },
          h('b', null, e.name, e.source === 'hiem' ? h('span', { class: 'rare-star', 'aria-label': 'món hiếm' }, ' ★') : null),
          h('span', { class: 'book-tags' },
            h('span', { class: ['book-source', 'src-' + e.source] }, e.sourceLabel),
            e.flawlessBadge ? h('span', { class: 'book-flawless', testid: 'book-flawless-' + e.id, title: S.flawless }, '★ ' + S.flawless) : null)))
      if (teaser) {
        return h('article', props, head, h('p', { class: 'small muted' }, `Sắp có: ${e.note || 'mở ở chặng sau'}`))
      }
      const money = h('div', { class: 'book-money small' },
        h('span', null, `${S.labels.price}: `, h('b', null, formatVND(e.price))),
        h('span', null, `${S.labels.cost}: `, h('b', null, formatVND(e.cost))),
        h('span', null, 'Lãi mỗi phần: ', h('b', null, formatVND(e.profit))),
        // M4: món hiếm: giá vốn có phần hàng hiếm quy đổi (lấy từ kho, trong ca không trừ Tiền quán)
        e.rareCost > 0 ? h('span', { class: 'book-rare-cost muted', testid: 'book-hiem-cost-' + e.id },
          `Giá vốn gồm ${formatVND(e.rareCost)} hàng hiếm quy đổi (lấy từ kho, không trừ Tiền quán): trong ca chỉ trừ ${formatVND(Math.max(0, e.cost - e.rareCost))} mỗi phần.`) : null)
      let progress = null
      if (m) {
        progress = h('div', { class: 'book-mastery' },
          h('div', { class: 'book-stats small' },
            h('span', null, `${S.labels.cooks}: `, h('b', { testid: 'book-cooks-' + e.id }, String(e.cooks))),
            h('span', null, `${S.labels.best}: `, h('b', { testid: 'book-best-' + e.id }, e.cooks ? String(e.best) : '—'))),
          h('div', { class: 'book-level small' },
            h('span', null, `${S.labels.mastery}: `, h('b', { testid: 'book-level-' + e.id }, `${m.name} (cấp ${m.level})`)),
            m.next ? h('span', { class: 'muted' }, ` · còn ${m.next.need} lần Ngon để lên ${m.next.name}`) : h('span', { class: 'muted' }, ' · đã lên cấp cao nhất của chặng')),
          m.next ? progressBar(m.goodCooks, m.next.target, { label: `${S.labels.mastery} ${e.name}` }) : progressBar(1, 1))
      } else if (e.status === 'hiem' && e.rare) {
        // M4: "Mảnh 2/3 · Cần Bánh tráng trộn"; đủ mảnh → nấu thử (thử lại tới khi đạt hạng Được)
        progress = h('div', { class: 'book-rare', testid: 'book-rare-' + e.id, dataset: { n: String(e.rare.n), ready: String(!!e.rare.ready) } },
          h('p', { class: 'small book-note' }, e.note),
          progressBar(e.rare.n, e.rare.need, { label: 'Mảnh công thức ' + e.name }),
          h('p', { class: 'small muted' }, 'Mỗi phần dùng: ' + e.rare.ings.map(x => `${x.n} ${x.name}`).join(', ')),
          e.rare.ready ? h('button', { class: 'btn btn-primary btn-small', type: 'button', testid: 'book-taste-' + e.id,
            onclick: () => { app.sound('click'); app.go('tasting', { recipeId: e.id, back: 'recipe-book' }) } }, 'Nấu thử để mở món') : null)
      } else {
        progress = h('p', { class: 'small muted book-note' },
          e.status === 'shop' ? `${e.note} · ${formatVND(e.shopPrice)}` : e.note)
      }
      return h('article', props,
        h('button', { class: 'book-card-btn', type: 'button', testid: 'book-open-' + e.id, 'aria-label': 'Xem công thức ' + e.name, onclick: () => openDetail(e) },
          head),
        money, progress)
    }

    function openDetail(e) {
      const d = recipeDetail(app.state, e.id, app.ctx)
      if (!d) return
      app.sound('paper')
      app.modal({
        testid: 'recipe-detail', className: 'book-detail', dismissible: true, blocking: false,
        render: close => h('div', { class: 'book-detail-body', dataset: { recipeId: d.id } },
          h('div', { class: 'book-detail-head' },
            svgBox(icon(d.icon), 'dish-icon'),
            h('div', null, h('h2', { class: 'modal-title' }, d.name), h('p', { class: 'small muted' }, e.sourceLabel))),
          d.desc ? h('p', { class: 'small' }, d.desc) : null,
          h('h3', { class: 'book-h3' }, S.labels.ingredients),
          h('ul', { class: 'book-ings' }, d.ingredients.map(i => h('li', { class: 'role-' + i.role, testid: 'recipe-detail-ing-' + i.id },
            svgBox(icon(i.icon), 'book-ing-icon'),
            h('span', null, i.name + (i.qty > 1 ? ` ×${i.qty}` : '')),
            h('small', { class: 'muted' }, i.role === 'tuy_chon' && i.when.length ? `khi khách dặn ${i.when.join(', ')}` : i.roleLabel)))),
          h('h3', { class: 'book-h3' }, `${S.labels.steps} (${d.steps.length})`),
          h('ol', { class: 'book-steps' }, d.steps.map(s => h('li', { testid: 'recipe-detail-step-' + s.id },
            h('span', null, s.label),
            h('small', { class: 'muted' }, [s.typeName !== s.label ? s.typeName : '', s.chooseMethod ? 'chọn cách sơ chế' : '', s.critical ? 'bước quyết định' : '']
              .filter(Boolean).join(' · ') || 'bắt buộc, làm đầu tiên')))),
          d.notes.length ? h('h3', { class: 'book-h3' }, 'Khách hay dặn') : null,
          d.notes.length ? h('p', { class: 'small book-notes' }, d.notes.map(n => n.label + (n.surcharge ? ` (+${formatVND(n.surcharge)})` : '')).join(' · ')) : null,
          h('p', { class: 'small muted' }, 'Kệ ở bếp còn vài nguyên liệu dễ nhầm, chọn cho đúng nha.'),
          h('div', { class: 'modal-actions' }, h('button', { class: 'btn btn-primary', type: 'button', testid: 'recipe-detail-close', onclick: () => close(true) }, 'Đóng')))
      })
    }

    function renderDialect(body) {
      const words = dialectBook(app.ctx)
      body.appendChild(h('p', { class: 'small book-dialect-intro' },
        'Khách giọng Nam và giọng Bắc gọi cùng một thứ bằng từ khác nhau. Nghe ra đúng từ là ghi phiếu đúng.'))
      body.appendChild(h('div', { class: 'dialect-head', 'aria-hidden': 'true' }, h('span', null, 'Giọng Nam'), h('span', null, 'Giọng Bắc')))
      body.appendChild(h('ul', { class: 'dialect-list', testid: 'dialect-list' }, words.map(w => h('li', { class: 'dialect-item', testid: 'dialect-' + w.id },
        h('div', { class: 'dialect-pair' },
          h('b', { class: 'dialect-nam' }, w.nam),
          h('span', { class: 'dialect-eq', 'aria-label': 'cũng là' }, '='),
          h('b', { class: 'dialect-bac' }, w.bac)),
        w.meaning ? h('small', { class: 'muted' }, w.meaning) : null))))
    }

    render()
    if (params.recipeId) {
      const e = recipeBook(app.state, app.ctx).entries.find(x => x.id === params.recipeId && x.status !== 'teaser')
      if (e) openDetail(e)
    }
    return { unmount() { destroyed = true } }
  }
}
