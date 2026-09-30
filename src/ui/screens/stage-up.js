// Màn "Quán cóc vỉa hè – sắp khai trương": điều kiện lên Chặng 2 (thanh tiến độ + gợi ý), bản đồ 7 chặng,
// nút khóa "Sắp có ở bản sau" và các mục tiêu tiếp theo (Không tì vết, thạo cấp 3, kỷ lục ca).
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
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

    body.appendChild(h('section', { class: ['stage-hero', st.eligible ? 'is-ready' : ''] },
      cartView(state, app.data, 'cart-view stage-cart'),
      h('p', null, st.eligible
        ? 'Dì Sáu mừng rơi nước mắt: xe mình đã đủ sức dọn ra vỉa hè! Quán cóc đang được dựng, sẽ khai trương ở bản sau.'
        : 'Đạt đủ các mốc dưới đây để dọn xe ra vỉa hè, mở Quán cóc có bàn ghế và khách quen.'),
      h('button', { class: 'btn btn-big btn-muted', type: 'button', disabled: true, testid: 'stage-up-locked', 'aria-disabled': 'true' },
        '🔒 ' + (st.lockedText || M.stageUpLocked)),
      st.eligible ? h('p', { class: 'small center' }, M.stageUpKeepPlaying) : null))

    body.appendChild(h('h2', { class: 'meta-section' }, 'Điều kiện lên Chặng 2'))
    body.appendChild(h('ul', { class: 'cond-list', testid: 'stage-conditions' }, st.conditions.map(c =>
      h('li', { class: ['cond', c.done ? 'is-done' : ''], testid: 'stage-cond-' + c.id },
        h('div', { class: 'cond-head' }, h('span', { class: 'cond-mark' }, c.done ? '✓' : '○'), h('b', null, c.label)),
        c.kind === 'chain' ? null : progressBar(c.progress, null, { label: c.label }),
        c.hint ? h('p', { class: 'cond-hint small' }, c.hint) : null))))

    // Bản đồ 7 chặng
    body.appendChild(h('h2', { class: 'meta-section' }, 'Hành trình 7 chặng'))
    body.appendChild(h('ol', { class: 'stage-map' }, [1, 2, 3, 4, 5, 6, 7].map(n => h('li', {
      class: ['stage-node', n === (state.chang || 1) ? 'is-current' : '', n > (state.chang || 1) ? 'is-locked' : '']
    },
    h('span', { class: 'stage-no' }, String(n)),
    h('div', null, h('b', null, S.chang[n]),
      h('small', null, n === (state.chang || 1) ? 'Đang ở đây' : STAGE_TEASE[n] || ''))))))

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
        h('li', null, h('span', null, M.recordProfit), h('b', null, rec.bestProfit === null ? '—' : formatVND(rec.bestProfit))),
        h('li', null, h('span', null, M.recordFiveStars), h('b', null, String(rec.mostFiveStars))),
        h('li', null, h('span', null, M.recordStreak), h('b', null, String(rec.longestStreak))))))
    return { unmount() {} }
  }
}
