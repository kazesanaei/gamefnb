// Màn Sổ tay nghề (M3): 20 thẻ Mẹo nghề chia nhóm Quầy / Bếp / Kho / Phục vụ-Quản lý. Thẻ đã mở hiện đủ chữ, thẻ
// chưa mở hiện bóng mờ kèm gợi ý cách mở. Đủ một nhóm → nhận danh hiệu + 20 Muỗng Vàng ngay tại đây (1 lần).
// Mở từ màn Chuẩn bị (open-notebook). params: { group } mở sẵn thẻ nhóm đó.
//
// M5 Đợt 3 (gói M-D, bản 0.5.2) — vẽ lại thành cuốn sổ tay gáy lò xo:
// - Bìa xanh có hàng khoen lò xo ở mép trên, mặt giấy kẻ dòng. Đầu sổ: tiến độ sưu tập (thanh M-N + số), Dì Sáu nhắc một
//   mẹo đã mở (bán thân + bong bóng).
// - Thẻ nhóm là tab chỉ mục có hình (quầy, bếp, rổ, ngôi sao), số thẻ đã mở và chấm đỏ khi đủ nhóm chờ nhận.
// - Trang nhóm: dải màu nhóm, thanh tiến độ, dải phần thưởng sưu tập bằng ô vật phẩm (Muỗng Vàng, danh hiệu) + nút nhận;
//   có quà chờ thì dải viền vàng (tĩnh). Đã nhận thì con dấu "Đã nhận thưởng".
// - Thẻ Mẹo nghề đã mở: tờ giấy ghi chú màu dán băng keo, có hình minh họa nhỏ (icon có sẵn theo từng thẻ, không có thì
//   hình của nhóm). Thẻ chưa mở: tờ úp có dấu "?" và dòng "Cách mở: …".
// - Hiệu ứng chỉ theo sự kiện: bấm nhận thưởng → Muỗng Vàng bay về viên ở đầu màn + con dấu đóng một lần (celebrateReward
//   của meta-ui); đổi nhóm → trang trượt nhẹ một lần. Giảm chuyển động: không bay, không trượt. Vẽ lại không phát lại.
// Giữ: export NOTEBOOK_SVG, mọi testid / data-* / chữ mà e2e bám (docs/tham-khao/m5-ban-do-ma.md mục 9.3).
import { h, svgBox } from '../dom.js'
import { DI_SAU, icon, prop, head, SCENE_ICONS } from '../art.js'
import { metaArt } from '../art/meta.js'
import { notebookStatus, claimNotebookGroup, randomSeenTip } from '../../core/notebook.js'
import { screenHead, rewardChips, rewardLine, reasonText, progressBar, npcBust, celebrateReward } from '../components/meta-ui.js'
import { isReduced } from '../motion.js'

// Biểu tượng Sổ tay nghề (sổ xanh gáy lò xo có cây bút — hình lối vào so_tay_nghe của bộ hình meta, cel-shading).
// Giữ tên export cho nơi khác dùng.
export const NOTEBOOK_SVG = metaArt('so_tay_nghe')

const GROUP_HINT = {
  quay: 'Order, báo tổng, thối tiền, chuyển khoản, phiếu bếp.',
  bep: 'Rửa, thái, nêm, canh lửa và xử lý món hỏng.',
  kho: 'Định lượng và giữ giá vốn.',
  phuc_vu: 'Xử lý phàn nàn, tính giá vốn của quán.'
}

// Hình của nhóm (tab chỉ mục, đầu trang nhóm, hình dự phòng của thẻ).
const GROUP_ART = Object.freeze({
  quay: () => SCENE_ICONS.tab_quay || metaArt('cho_cong_thuc'),
  bep: () => SCENE_ICONS.tab_bep || icon('chao_chong_dinh'),
  kho: () => icon('ro'),
  phuc_vu: () => metaArt('sao_lon')
})

// Hình minh họa nhỏ cho từng thẻ Mẹo nghề (icon có sẵn của bộ hình); thẻ mới chưa có trong bảng dùng hình nhóm.
const TIP_ART = Object.freeze({
  doc_lai_order: () => SCENE_ICONS.khau_order,
  ghi_ngay_loi_dan: () => metaArt('ghi_no'),
  tach_dong: () => metaArt('doan_khach_hoi_duong'),
  bao_tong_ro_rang: () => SCENE_ICONS.khau_thanh_toan,
  tien_tren_nap_ket: () => SCENE_ICONS.khau_tinh_tien,
  dem_hai_lan: () => metaArt('xu'),
  noi_to_so_tien: () => icon('loa_bao_tien'),
  du_tien_le: () => SCENE_ICONS.hud_vi,
  qr_dung_so: () => metaArt('shipper_chuyen_khoan'),
  tra_truoc: () => SCENE_ICONS.khau_lam_do,
  ghi_chu_tren_phieu: () => SCENE_ICONS.khau_order,
  bao_truoc_thoi_gian_cho: () => SCENE_ICONS.hud_gio,
  soi_tien: () => metaArt('tien_nghi_gia'),
  cho_tien_ve: () => SCENE_ICONS.dong_xu,
  rua_roi_moi_thai: () => prop('voi_nuoc') || icon('dua_leo'),
  thot_rieng: () => icon('thot'),
  nem_tu_it: () => icon('muoi'),
  chao_dau_boc_chay: () => icon('chao_chong_dinh'),
  lam_lai_khi_hong: () => metaArt('doi_y'),
  dinh_luong_chuan: () => icon('ro'),
  kiem_hang: () => metaArt('kiem_tra_attp'),
  xu_ly_phan_nan: () => head('kho_tinh', 'buc'),
  ty_le_gia_von: () => icon('may_tinh'),
  giu_loi_di: () => metaArt('trat_tu_do_thi')
})

function tipArt(t, groupId) {
  let s = ''
  try { s = TIP_ART[t.id] ? TIP_ART[t.id]() : '' } catch { s = '' }
  return s || (GROUP_ART[groupId] ? GROUP_ART[groupId]() : '') || icon('fallback')
}

// Số khoen lò xo ở mép trên bìa (đều nhau theo bề ngang, CSS dàn đều).
const RINGS = 11

export default {
  mount(root, app, params = {}) {
    const el = h('section', { class: 'meta-screen notebook-screen', testid: 'screen-notebook' })
    root.appendChild(el)
    let destroyed = false
    // hiệu ứng một lần theo sự kiện (đổi nhóm, vừa nhận thưởng); render() xóa cờ sau khi vẽ
    let slideNext = false
    let stampGroup = null
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
        sub: `Đã mở ${st.unlocked}/${st.total} thẻ Mẹo nghề · đủ nhóm được quà`
      }))
      const body = h('div', { class: 'meta-body notebook-body' })
      el.appendChild(body)
      const page = h('div', { class: 'nb-page' })
      body.appendChild(h('div', { class: 'nb-book' },
        h('div', { class: 'nb-spiral', 'aria-hidden': 'true' }, Array.from({ length: RINGS }, () => h('span', { class: 'nb-ring' }))),
        page))
      // tiến độ sưu tập
      page.appendChild(h('div', { class: 'nb-overall', testid: 'notebook-progress', dataset: { unlocked: st.unlocked, total: st.total } },
        svgBox(metaArt('so_tay_nghe'), 'nb-overall-ico'),
        h('div', { class: 'nb-overall-main' },
          h('span', { class: 'nb-overall-lbl' }, 'Thẻ đã mở'),
          progressBar(st.unlocked, st.total, { label: 'Thẻ Mẹo nghề đã mở' })),
        h('span', { class: 'nb-overall-num' }, h('b', null, String(st.unlocked)), `/${st.total}`)))
      if (featured) {
        page.appendChild(h('div', { class: 'npc-talk compact nb-featured', testid: 'notebook-featured' },
          svgBox(npcBust('di_sau') || DI_SAU.vui, 'npc-face nb-featured-face'),
          h('div', { class: 'bubble npc-bubble nb-featured-bubble' },
            h('b', null, 'Dì Sáu nhắc: ' + featured.title), h('p', null, featured.text))))
      }
      // Thẻ nhóm: Quầy / Bếp / Kho / Phục vụ-Quản lý (số thẻ đã mở, chấm đỏ khi đủ nhóm chờ nhận thưởng)
      page.appendChild(h('nav', { class: 'nb-tabs', role: 'tablist', 'aria-label': 'Nhóm Mẹo nghề' }, st.groups.map(g => h('button', {
        class: ['nb-tab', 'nb-g-' + g.id, g.id === group ? 'active' : '', g.complete ? 'is-complete' : ''], type: 'button', role: 'tab',
        testid: 'notebook-tab-' + g.id, 'aria-selected': String(g.id === group), dataset: { dot: g.canClaim ? '1' : '0' },
        'aria-label': `${g.name}: đã mở ${g.unlocked}/${g.total} thẻ` + (g.canClaim ? ', có thưởng chờ nhận' : ''),
        onclick: () => {
          if (g.id === group) return
          group = g.id
          app.sound('paper')
          slideNext = !isReduced(app)
          render()
        }
      },
      svgBox(GROUP_ART[g.id] ? GROUP_ART[g.id]() : icon('fallback'), 'nb-tab-ico'),
      h('span', { class: 'nb-tab-name' }, shortName(g.name)),
      h('span', { class: 'nb-tab-num' }, g.complete ? svgBox(metaArt('dau_tick'), 'nb-tab-tick') : null, `${g.unlocked}/${g.total}`),
      g.canClaim ? h('span', { class: 'red-dot', 'aria-label': 'Có thưởng chờ nhận' }) : null))))
      const cur = st.groups.find(g => g.id === group) || st.groups[0]
      if (cur) page.appendChild(groupCard(cur))
      slideNext = false
      stampGroup = null
      body.appendChild(h('p', { class: 'meta-hint nb-foot-hint' },
        'Mẹo nghề mở dần khi bạn gặp tình huống lần đầu trong ca (tối đa 1 thẻ mỗi ca sau ngày 1). Mọi con số trong mẹo là số liệu minh họa.'))
      root.scrollTop = scroll
    }

    // Tên ngắn cho thẻ nhóm (màn hẹp): "Phục vụ, Quản lý" → "Phục vụ"
    function shortName(name) {
      return String(name || '').split(',')[0]
    }

    function claim(g, btn) {
      // khung nguồn lấy TRƯỚC khi vẽ lại (nút cũ rời trang sau render)
      const strip = btn.closest('.nb-reward') || btn
      const r0 = strip.getBoundingClientRect()
      const from = { left: r0.left, top: r0.top, width: r0.width, height: r0.height }
      const r = claimNotebookGroup(app.state, g.id, app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      app.sound('chest')
      app.vibrate(30)
      app.toast(`Đủ nhóm ${g.name}: ${rewardLine(r.reward, app.data)}`, { kind: 'good', testid: 'notebook-toast' })
      app.saveNow()
      stampGroup = isReduced(app) ? null : g.id
      render()
      // Muỗng Vàng bay về viên ở đầu màn, danh hiệu nổ sao tại chỗ (giảm chuyển động: dấu tĩnh + nhịp sáng)
      try { celebrateReward(app, from, r.reward) } catch { /* hiệu ứng không được làm hỏng việc nhận thưởng */ }
    }

    function groupCard(g) {
      const btn = g.claimed
        ? h('span', { class: ['nb-claimed', stampGroup === g.id ? 'is-stamping' : ''], testid: 'notebook-claimed-' + g.id },
          svgBox(metaArt('dau_tick'), 'nb-claimed-ico'), h('span', null, 'Đã nhận thưởng'))
        : h('button', {
          class: ['btn', 'btn-small', 'nb-claim', g.canClaim ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'notebook-claim-' + g.id,
          disabled: !g.canClaim || !!app.state.shift,
          onclick: e => claim(g, e.currentTarget)
        }, g.complete ? 'Nhận thưởng' : `Còn ${g.total - g.unlocked} thẻ`)
      let k = 0
      return h('section', {
        class: ['nb-group', 'nb-g-' + g.id, g.complete ? 'is-complete' : '', g.canClaim ? 'has-pending' : '', slideNext ? 'is-slide' : ''], testid: 'notebook-group-' + g.id,
        dataset: { unlocked: g.unlocked, total: g.total, claimed: String(g.claimed) }
      },
      h('div', { class: 'nb-group-head' },
        svgBox(GROUP_ART[g.id] ? GROUP_ART[g.id]() : icon('fallback'), 'nb-group-ico'),
        h('div', { class: 'nb-group-title' },
          h('h2', { class: 'nb-group-name' }, g.name, h('span', { class: 'nb-group-num' }, `${g.unlocked}/${g.total}`)),
          h('small', null, GROUP_HINT[g.id] || ''))),
      progressBar(g.unlocked, g.total, { label: g.name }),
      h('div', { class: ['nb-reward', g.canClaim ? 'g-claim-meta' : '', g.claimed ? 'is-claimed' : ''] },
        h('span', { class: 'nb-reward-lbl' }, svgBox(metaArt(g.claimed ? 'qua' : 'ruong_dong'), 'nb-reward-ico'), g.claimed ? 'Đã nhận:' : 'Đủ nhóm được:'),
        rewardChips(g.reward, app.data, { compact: true }),
        btn),
      h('ul', { class: 'nb-tips' }, g.tips.map(t => t.unlocked
        ? h('li', { class: ['nb-tip', 'is-open', 'nb-note-' + (k++ % 4)], testid: 'notebook-tip-' + t.id, dataset: { unlocked: 'true' } },
          svgBox(tipArt(t, g.id), 'nb-tip-ico'),
          h('div', { class: 'nb-tip-body' }, h('b', null, t.title), h('p', null, t.text)))
        : h('li', { class: 'nb-tip is-locked', testid: 'notebook-tip-' + t.id, dataset: { unlocked: 'false' } },
          h('span', { class: 'nb-tip-q', role: 'img', 'aria-label': 'Thẻ chưa mở' }, '?'),
          h('div', { class: 'nb-tip-body' },
            h('b', { 'aria-hidden': 'true' }, 'Thẻ úp'),
            h('p', { class: 'nb-hint' }, 'Cách mở: ' + (t.hint || 'Tiếp tục bán hàng để gặp tình huống mới.')))))))
    }

    render()
    return { unmount() { destroyed = true } }
  }
}
