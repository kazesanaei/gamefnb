// Màn "Quán cóc vỉa hè – sắp khai trương": điều kiện lên Chặng 2 (hình theo loại điều kiện, dấu ✓ khi đạt, thanh tiến độ +
// gợi ý), bản đồ 7 chặng, nút khóa lớn "Sắp có ở bản sau" và các mục tiêu tiếp theo (Không tì vết, thạo cấp 3, kỷ lục ca).
// M5 Đợt 3 (gói M-A, 0.5.2): đầu màn là cảnh "xe đẩy hiện tại → đường đi → mặt bằng tiếp theo" (xe vẽ bằng cartView theo đồ
// thẩm mỹ đang dùng; quán cóc vẽ cel-shading viền mực ngay trong tệp này, mờ + ổ khóa khi chưa đủ điều kiện).
// Giữ testid: screen-stage-up (data-eligible), stage-conditions, stage-cond-<id>, stage-up-locked, post-goals.
// Import trong Node an toàn: chuỗi SVG dựng thuần, không chạm DOM ở cấp module.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { DI_SAU_FACES } from '../art/people.js'
import { checkStageUp, markStageUpSeen, postGoals } from '../../core/progression.js'
import { formatVND } from '../format.js'
import { screenHead, progressBar, cartView } from '../components/meta-ui.js'

// Câu gợi mở cho các chặng chưa mở (bản đồ chặng).
const STAGE_TEASE = {
  2: '2 bàn con, đèn dây, khách quen có tên',
  3: 'Mặt bằng đầu tiên, máy tính tiền',
  4: '8 bàn, khách đi nhóm cả nhà',
  5: 'Bếp mở chia trạm, phục vụ bàn',
  6: 'Gỗ tối màu, gốm men lam',
  7: 'Mở chi nhánh khắp phố'
}

const INK = '#3a2618'
const r1 = v => Math.round(v * 10) / 10

// Quán cóc vỉa hè (Chặng 2): dây đèn, dù lớn, bàn nhựa thấp có tô và ly trà, ba ghế đẩu nhựa. Cel-shading: viền mực 3,
// nét trong 1,75; nền + mảng tối dưới-phải + điểm sáng trên-trái; bóng đất. Không gradient / filter / chữ. viewBox 240×170.
function quanCocArt() {
  // dây đèn: đường cong bậc hai, 9 bóng
  const P0 = [10, 16], P1 = [120, 52], P2 = [230, 16]
  let bulbs = ''
  for (let i = 1; i <= 9; i++) {
    const t = i / 10
    const x = (1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0]
    const y = (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]
    bulbs += `<path d="M${r1(x)} ${r1(y)}V${r1(y + 4)}" stroke-width="1.75"/><circle cx="${r1(x)}" cy="${r1(y + 8)}" r="4.2" fill="${i % 2 ? '#ffe28a' : '#fff6d0'}" stroke-width="1.75"/>`
  }
  const lights = `<path d="M${P0[0]} ${P0[1]}Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" fill="none" stroke-width="2"/>` + bulbs
  // dù: chóp tròn, mép lượn, 2 múi trắng, mảng tối nửa phải
  const canopy = '<path d="M92 70Q152 4 212 70Q202 78 192 70Q182 78 172 70Q162 78 152 70Q142 78 132 70Q122 78 112 70Q102 78 92 70Z" fill="#43a63d"/>' +
    '<path d="M152 14L118 72Q125 76 132 70L152 14Z" fill="#fffaf0" stroke="none"/><path d="M152 14L172 70Q179 76 186 72Z" fill="#fffaf0" stroke="none"/>' +
    `<path d="M152 14Q196 28 212 70Q202 78 192 70Q186 74 180 72Z" fill="${INK}" opacity=".16" stroke="none"/>` +
    '<path d="M92 70Q152 4 212 70Q202 78 192 70Q182 78 172 70Q162 78 152 70Q142 78 132 70Q122 78 112 70Q102 78 92 70Z" fill="none"/>' +
    '<ellipse cx="128" cy="36" rx="12" ry="4" fill="#fff" opacity=".5" stroke="none" transform="rotate(-28 128 36)"/>' +
    '<circle cx="152" cy="12" r="4" fill="#a5672b"/>'
  const pole = '<rect x="149" y="72" width="6" height="80" rx="2" fill="#c9ccd1" stroke-width="2.5"/>'
  // bàn nhựa xanh thấp + tô + ly trà tắc
  const table = '<rect x="64" y="132" width="7" height="22" rx="2" fill="#22679a"/><rect x="133" y="132" width="7" height="22" rx="2" fill="#22679a"/>' +
    '<rect x="56" y="122" width="92" height="11" rx="3" fill="#4aa3df"/><path d="M60 131H144" stroke="#22679a" stroke-width="2.5"/>' +
    '<path d="M70 121Q82 134 94 121Z" fill="#fff8e6"/><path d="M74 119Q82 116 90 119" fill="none" stroke="#e9a64c" stroke-width="2.5"/>' +
    '<path d="M78 112Q76 108 79 104M86 112Q84 108 87 104" fill="none" stroke="#a5a5a5" stroke-width="1.75"/>' +
    '<path d="M112 104L114 121H124L126 104Z" fill="#f7b928"/><path d="M114 108H124" stroke="#fff" stroke-width="1.75" opacity=".8"/>' +
    '<circle cx="119" cy="114" r="2.6" fill="#7cc35a" stroke-width="1.5"/>'
  // ghế đẩu nhựa: mặt + thân thang + lỗ tay cầm
  const stool = (x, c0, c1) => `<path d="M${x - 13} 140H${x + 13}L${x + 10} 158H${x - 10}Z" fill="${c0}"/>` +
    `<path d="M${x + 5} 141H${x + 13}L${x + 10} 158H${x + 3}Z" fill="${c1}" stroke="none"/>` +
    `<rect x="${x - 16}" y="134" width="32" height="7" rx="3" fill="${c0}"/>` +
    `<circle cx="${x}" cy="149" r="3" fill="${INK}" opacity=".45" stroke="none"/>` +
    `<path d="M${x - 11} 136H${x - 3}" stroke="#fff" stroke-width="1.75" opacity=".55"/>`
  const ground = `<ellipse cx="120" cy="161" rx="108" ry="6" fill="${INK}" opacity=".15" stroke="none"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 170"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
    ground + lights + pole + canopy + table + stool(36, '#e0584a', '#b83c30') + stool(104, '#4aa3df', '#22679a') + stool(196, '#e0584a', '#b83c30') + '</g></svg>'
}

// Mũi tên đi tới (chevron đôi, viền mực) và ổ khóa nhỏ (viền mực).
const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 28"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">` +
  '<path d="M4 6L14 14L4 22Z" fill="#f7b928"/><path d="M18 4L30 14L18 24Z" fill="#e8483a"/><path d="M33 9L38 14L33 19" fill="none"/></g></svg>'
const LOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">` +
  '<path d="M7 11V8C7 5 9 3 12 3C15 3 17 5 17 8V11" fill="none"/><rect x="4.5" y="11" width="15" height="10" rx="2.5" fill="#f7b928"/>' +
  '<path d="M12 15V17.5" stroke-width="2.2"/></g></svg>'

// Hình theo loại điều kiện (giống thẻ Giấc mơ ở màn Chuẩn bị).
function condArt(kind) {
  if (kind === 'reputation') return metaArt('danh_hieu')
  if (kind === 'avgRating') return SCENE_ICONS.hud_sao
  if (kind === 'recipes') return metaArt('so_cong_thuc')
  if (kind === 'mastery') return metaArt('sao_lon')
  if (kind === 'chain') return DI_SAU_FACES.vui
  if (kind === 'wallet') return SCENE_ICONS.hud_vi
  return metaArt('cup')
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS
    const M = S.meta
    const state = app.state
    const st = checkStageUp(state, app.ctx)
    if (st.eligible) { markStageUpSeen(state); app.saveNow() }
    const el = h('section', { class: 'meta-screen stage-screen', testid: 'screen-stage-up', dataset: { eligible: st.eligible ? 'true' : 'false' } })
    root.appendChild(el)
    el.appendChild(screenHead(app, { title: st.screenTitle || M.stageUpTitle, sub: st.eligible ? 'Đủ điều kiện rồi!' : M.nextDream, backLabel: '‹ Chuẩn bị' }))
    const body = h('div', { class: 'meta-body' })
    el.appendChild(body)

    const cur = state.chang || 1
    const next = st.chang || cur + 1
    const done = st.conditions.filter(c => c.done).length
    const total = st.conditions.length
    // Cảnh: xe hiện tại → mặt bằng tiếp theo
    body.appendChild(h('section', { class: ['stage-hero', st.eligible ? 'is-ready' : ''] },
      h('div', { class: 'su-road' },
        h('div', { class: 'su-end su-from' },
          cartView(state, app.data, 'cart-view stage-cart'),
          h('span', { class: 'su-tag' }, `Chặng ${cur}`, h('small', null, S.chang[cur] || ''))),
        h('div', { class: 'su-arrow', 'aria-hidden': 'true' }, svgBox(ARROW_SVG, 'su-arrow-ico'), h('span', { class: 'su-count' }, `${done}/${total}`)),
        h('div', { class: 'su-end su-next' },
          svgBox(quanCocArt(), ['su-next-art', st.eligible ? '' : 'is-locked'].filter(Boolean).join(' ')),
          st.eligible ? null : svgBox(LOCK_SVG, 'su-lock'),
          h('span', { class: 'su-tag' }, `Chặng ${next}`, h('small', null, st.name || S.chang[next] || '')))),
      progressBar(done, total || 1, { label: `Đã đạt ${done}/${total} điều kiện`, cap: 'cup' }),
      h('p', null, st.eligible
        ? 'Dì Sáu mừng rơi nước mắt: xe mình đã đủ sức dọn ra vỉa hè! Quán cóc đang được dựng, sẽ khai trương ở bản sau.'
        : 'Đạt đủ các mốc dưới đây để dọn xe ra vỉa hè, mở Quán cóc có bàn ghế và khách quen.'),
      h('button', { class: 'btn btn-big btn-muted su-locked-btn', type: 'button', disabled: true, testid: 'stage-up-locked', 'aria-disabled': 'true' },
        svgBox(LOCK_SVG, 'su-locked-ico'), h('span', null, st.lockedText || M.stageUpLocked)),
      st.eligible ? h('p', { class: 'small center' }, M.stageUpKeepPlaying) : null))

    body.appendChild(h('h2', { class: 'meta-section' }, `Điều kiện lên Chặng ${next}`))
    body.appendChild(h('ul', { class: 'cond-list', testid: 'stage-conditions' }, st.conditions.map(c =>
      h('li', { class: ['cond', c.done ? 'is-done' : ''], testid: 'stage-cond-' + c.id, dataset: { kind: c.kind } },
        h('span', { class: 'su-cond-art' }, svgBox(condArt(c.kind), 'svg-box'),
          h('span', { class: 'cond-mark', 'aria-label': c.done ? 'Đã đạt' : 'Chưa đạt' }, c.done ? '✓' : '○')),
        h('div', { class: 'cond-body' },
          h('div', { class: 'cond-head' }, h('b', null, c.label)),
          c.kind === 'chain' ? null : progressBar(c.progress, null, { label: c.label }),
          c.hint ? h('p', { class: 'cond-hint small' }, c.hint) : null)))))

    // Bản đồ 7 chặng
    body.appendChild(h('h2', { class: 'meta-section' }, 'Hành trình 7 chặng'))
    body.appendChild(h('ol', { class: 'stage-map' }, [1, 2, 3, 4, 5, 6, 7].map(n => h('li', {
      class: ['stage-node', n === cur ? 'is-current' : '', n > cur ? 'is-locked' : '']
    },
    h('span', { class: 'stage-no' }, String(n)),
    h('div', null, h('b', null, S.chang[n]),
      h('small', null, n === cur ? 'Đang ở đây' : STAGE_TEASE[n] || '')),
    n === cur ? svgBox(SCENE_ICONS.tab_quay, 'su-node-ico') : n === cur + 1 ? svgBox(metaArt('cup'), 'su-node-ico') : null))))

    // Mục tiêu tiếp theo
    const pg = postGoals(state, app.ctx)
    const rec = pg.records
    body.appendChild(h('h2', { class: 'meta-section' }, M.postGoals))
    body.appendChild(h('section', { class: 'card goals-card', testid: 'post-goals' },
      h('p', null, h('b', null, `Không tì vết: ${pg.flawless.done}/${pg.flawless.total} món`)),
      h('ul', { class: 'goal-recipes' }, pg.recipes.map(r => h('li', { class: r.flawless ? 'is-done' : '' },
        svgBox(icon('mon_' + r.id), 'dish-icon tiny'),
        h('span', null, h('b', null, r.name), h('small', null, (r.flawless ? 'Có huy hiệu Không tì vết · ' : 'Chưa có Không tì vết · ') + (S.masteryLevels[r.level] || r.level)))))),
      h('p', null, h('b', null, `Thạo cấp 3: ${pg.mastery.done}/${pg.mastery.total} món`)),
      h('ul', { class: 'records' },
        h('li', null, svgBox(metaArt('xu'), 'su-rec-ico'), h('span', null, M.recordProfit), h('b', null, rec.bestProfit === null ? '—' : formatVND(rec.bestProfit))),
        h('li', null, svgBox(SCENE_ICONS.hud_sao, 'su-rec-ico'), h('span', null, M.recordFiveStars), h('b', null, String(rec.mostFiveStars))),
        h('li', null, svgBox(SCENE_ICONS.khau_order, 'su-rec-ico'), h('span', null, M.recordStreak), h('b', null, String(rec.longestStreak))))))
    return { unmount() {} }
  }
}
