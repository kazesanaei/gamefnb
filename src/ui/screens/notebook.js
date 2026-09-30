// Màn Sổ tay nghề (M3): 20 thẻ Mẹo nghề chia nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Thẻ đã mở hiện đủ chữ, thẻ
// chưa mở hiện bóng mờ kèm gợi ý cách mở. Đủ một nhóm → nhận danh hiệu + 20 Muỗng Vàng ngay tại đây (1 lần).
// Mở từ màn Chuẩn bị (open-notebook). params: { group } mở sẵn thẻ nhóm đó.
import { h, svgBox } from '../dom.js'
import { DI_SAU } from '../art.js'
import { notebookStatus, claimNotebookGroup, randomSeenTip } from '../../core/notebook.js'
import { screenHead, rewardChips, rewardLine, reasonText, progressBar } from '../components/meta-ui.js'

// Biểu tượng Sổ tay nghề (cuốn sổ có dấu trang), dùng cho lưới lối vào ở màn Chuẩn bị.
export const NOTEBOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#3a2618" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">' +
  '<rect x="12" y="8" width="40" height="50" rx="5" fill="#3f9a52"/>' +
  '<rect x="18" y="8" width="34" height="50" rx="4" fill="#6fbf73"/>' +
  '<path d="M25 20 H45 M25 28 H45 M25 36 H38" stroke="#ffffff" stroke-width="3"/>' +
  '<path d="M40 8 V26 L44.5 22 L49 26 V8" fill="#f5c542"/>' +
  '<path d="M12 16 H18 M12 26 H18 M12 36 H18 M12 46 H18" stroke-width="2"/></g></svg>'

const GROUP_HINT = {
  quay: 'Order, báo tổng, thối tiền, chuyển khoản, phiếu bếp.',
  bep: 'Rửa, thái, nêm, canh lửa và xử lý món hỏng.',
  kho: 'Định lượng và giữ giá vốn.',
  phuc_vu: 'Xử lý phàn nàn, tính giá vốn của quán.'
}

export default {
  mount(root, app, params = {}) {
    const el = h('section', { class: 'meta-screen notebook-screen', testid: 'screen-notebook' })
    root.appendChild(el)
    let destroyed = false
    // Mẹo đã mở hiện ngẫu nhiên ở đầu sổ (chọn 1 lần mỗi lần mở màn)
    const featured = randomSeenTip(app.state, app.ctx, Math.random)
    // Nhóm đang xem: theo params, không thì nhóm có thưởng chờ nhận, rồi nhóm còn thẻ chưa mở
    let group = null
    {
      const st0 = notebookStatus(app.state, app.ctx)
      const pickG = st0.groups.find(g => g.id === params.group) || st0.groups.find(g => g.canClaim) ||
        st0.groups.find(g => !g.complete) || st0.groups[0]
      group = pickG ? pickG.id : null
    }

    function render() {
      if (destroyed) return
      const st = notebookStatus(app.state, app.ctx)
      const scroll = root.scrollTop
      el.textContent = ''
      el.appendChild(screenHead(app, {
        title: app.data.STRINGS.screens.notebook, backLabel: '‹ Chuẩn bị',
        sub: `Đã mở ${st.unlocked}/${st.total} thẻ Mẹo nghề · đủ một nhóm được danh hiệu và Muỗng Vàng`
      }))
      const body = h('div', { class: 'meta-body notebook-body' })
      el.appendChild(body)
      body.appendChild(h('div', { class: 'nb-overall', testid: 'notebook-progress', dataset: { unlocked: st.unlocked, total: st.total } },
        progressBar(st.unlocked, st.total, { label: 'Thẻ Mẹo nghề đã mở' }),
        h('span', { class: 'nb-overall-num' }, `${st.unlocked}/${st.total}`)))
      if (featured) {
        body.appendChild(h('div', { class: 'npc-talk compact nb-featured', testid: 'notebook-featured' },
          svgBox(DI_SAU.vui, 'npc-face small'),
          h('div', { class: 'bubble npc-bubble' }, h('b', null, 'Dì Sáu nhắc: ' + featured.title), h('p', null, featured.text))))
      }
      // Thẻ nhóm: Quầy / Bếp / Kho / Phục vụ-Quản lý (số thẻ đã mở, chấm đỏ khi đủ nhóm chờ nhận thưởng)
      body.appendChild(h('nav', { class: 'nb-tabs', role: 'tablist', 'aria-label': 'Nhóm Mẹo nghề' }, st.groups.map(g => h('button', {
        class: ['nb-tab', g.id === group ? 'active' : '', g.complete ? 'is-complete' : ''], type: 'button', role: 'tab',
        testid: 'notebook-tab-' + g.id, 'aria-selected': String(g.id === group), dataset: { dot: g.canClaim ? '1' : '0' },
        onclick: () => { if (g.id !== group) { group = g.id; app.sound('click'); render() } }
      },
      h('span', { class: 'nb-tab-name' }, shortName(g.name)),
      h('span', { class: 'nb-tab-num' }, `${g.unlocked}/${g.total}`),
      g.canClaim ? h('span', { class: 'red-dot', 'aria-label': 'Có thưởng chờ nhận' }) : null))))
      const cur = st.groups.find(g => g.id === group) || st.groups[0]
      if (cur) body.appendChild(groupCard(cur))
      body.appendChild(h('p', { class: 'meta-hint small' },
        'Mẹo nghề mở dần khi bạn gặp tình huống lần đầu trong ca (tối đa 1 thẻ mỗi ca sau ngày 1). Mọi con số trong mẹo là số liệu minh họa.'))
      root.scrollTop = scroll
    }

    // Tên ngắn cho thẻ nhóm (màn hẹp): "Phục vụ, Quản lý" → "Phục vụ"
    function shortName(name) {
      return String(name || '').split(',')[0]
    }

    function groupCard(g) {
      const btn = g.claimed
        ? h('span', { class: 'nb-claimed', testid: 'notebook-claimed-' + g.id }, 'Đã nhận thưởng')
        : h('button', {
          class: ['btn', 'btn-small', g.canClaim ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'notebook-claim-' + g.id,
          disabled: !g.canClaim || !!app.state.shift,
          onclick: () => {
            const r = claimNotebookGroup(app.state, g.id, app.ctx)
            if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
            app.sound('chest')
            app.vibrate(30)
            app.toast(`Đủ nhóm ${g.name}: ${rewardLine(r.reward, app.data)}`, { kind: 'good', testid: 'notebook-toast' })
            app.saveNow()
            render()
          }
        }, g.complete ? 'Nhận thưởng' : `Còn ${g.total - g.unlocked} thẻ`)
      return h('section', {
        class: ['card', 'nb-group', g.complete ? 'is-complete' : '', g.canClaim ? 'has-pending' : ''], testid: 'notebook-group-' + g.id,
        dataset: { unlocked: g.unlocked, total: g.total, claimed: String(g.claimed) }
      },
      h('div', { class: 'nb-group-head' },
        h('div', { class: 'nb-group-title' },
          h('h2', { class: 'card-title' }, `${g.name} · ${g.unlocked}/${g.total}`),
          h('small', { class: 'muted' }, GROUP_HINT[g.id] || '')),
        g.canClaim ? h('span', { class: 'red-dot', 'aria-label': 'Có thưởng chờ nhận' }) : null),
      progressBar(g.unlocked, g.total, { label: g.name }),
      h('div', { class: 'nb-reward' },
        h('span', { class: 'small' }, g.claimed ? 'Đã nhận:' : 'Đủ nhóm được:'),
        rewardChips(g.reward, app.data, { compact: true }),
        btn),
      h('ul', { class: 'nb-tips' }, g.tips.map(t => t.unlocked
        ? h('li', { class: 'nb-tip is-open', testid: 'notebook-tip-' + t.id, dataset: { unlocked: 'true' } },
          h('b', null, t.title), h('p', null, t.text))
        : h('li', { class: 'nb-tip is-locked', testid: 'notebook-tip-' + t.id, dataset: { unlocked: 'false' } },
          h('b', { 'aria-label': 'Thẻ chưa mở' }, '? ? ?'),
          h('p', { class: 'nb-hint' }, 'Cách mở: ' + (t.hint || 'Tiếp tục bán hàng để gặp tình huống mới.'))))))
    }

    render()
    return { unmount() { destroyed = true } }
  }
}
