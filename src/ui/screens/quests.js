// Màn "Việc hôm nay": 3 việc (Quầy, Bếp, Chất lượng) đổi lúc 04:00 giờ Việt Nam, nhận thưởng, đổi việc, Rương ngày;
// kèm các chuỗi nhiệm vụ đang làm (Dì Sáu, Anh Khoa).
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { questList, claimQuest, claimDailyChest, rerollQuest, questDef, ensureDaily } from '../../core/quests.js'
import { chainStatus } from '../../core/chains.js'
import { nextResetMs } from '../../core/clock.js'
import { formatVND } from '../format.js'
import { screenHead, rewardChips, rewardLine, reasonText, progressBar, durationText, rewindNote } from '../components/meta-ui.js'
import { chainCard } from '../components/chain-card.js'

const GROUP_ICON = { quay: 'may_tinh', bep: 'thot', chat_luong: 'sao' }

export default {
  mount(root, app) {
    const S = app.data.STRINGS.meta
    const el = h('section', { class: 'meta-screen quests-screen', testid: 'screen-quests' })
    root.appendChild(el)

    function done(msg, kind = 'good') {
      if (msg) app.toast(msg, { kind })
      app.saveNow()
      render()
    }

    function render() {
      const state = app.state
      const nowInfo = app.nowInfo()
      ensureDaily(state, nowInfo, app.ctx)
      const ql = questList(state, app.ctx)
      const left = nextResetMs(nowInfo.trusted) - nowInfo.trusted
      el.textContent = ''
      el.appendChild(screenHead(app, { title: S.quests, sub: `${S.questResetAt} · còn ${durationText(left)}`, icon: 'lich', backLabel: '‹ Chuẩn bị', help: true }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      const body = h('div', { class: 'meta-body' })
      el.appendChild(body)
      if (state.shift) body.appendChild(h('p', { class: 'card card-warn small' }, reasonText(app, 'dang_ban')))

      const settings = state.settings || {}
      for (const q of ql.quests) {
        const def = questDef(app.ctx, q.id) || {}
        const money = !!def.money
        const num = money ? `${formatVND(q.progress)} / ${formatVND(q.target)}` : `${q.progress}/${q.target}`
        const paused = def.assist && settings[def.assist]
        body.appendChild(h('article', { class: ['quest-card', q.done ? 'is-done' : '', q.claimed ? 'is-claimed' : ''], testid: 'quest-' + q.index, dataset: { id: q.id, progress: q.progress, target: q.target } },
          h('div', { class: 'quest-top' },
            svgBox(icon(GROUP_ICON[q.group] || 'sao'), 'quest-icon'),
            h('div', { class: 'quest-main' },
              h('span', { class: 'quest-group g-' + q.group }, q.groupName),
              h('p', { class: 'quest-text' }, q.text))),
          h('div', { class: 'quest-prog' }, progressBar(q.progress, q.target, { label: q.text }), h('span', { class: 'quest-num' }, num)),
          paused ? h('p', { class: 'small quest-paused' }, `Đang bật ${def.assist === 'assistCash' ? 'Hỗ trợ tính tiền' : 'Hỗ trợ thao tác'} nên việc này tạm không đếm.`) : null,
          h('div', { class: 'quest-foot' },
            rewardChips(q.reward, app.data, { compact: true }),
            h('div', { class: 'quest-btns' },
              q.claimed ? null : h('button', {
                class: 'btn btn-ghost btn-small', type: 'button', testid: 'quest-reroll-' + q.index,
                disabled: q.done || (!ql.reroll.free && (state.goldSpoons || 0) < ql.reroll.cost),
                onclick: () => onReroll(q, ql)
              }, ql.reroll.free ? 'Đổi (miễn phí)' : `Đổi · ${ql.reroll.cost} Muỗng Vàng`),
              h('button', {
                class: ['btn', 'btn-small', q.canClaim ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'quest-claim-' + q.index,
                disabled: !q.canClaim || !!state.shift,
                onclick: () => {
                  const r = claimQuest(app.state, q.index, app.nowInfo(), app.ctx)
                  if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
                  app.sound('coin')
                  done('Nhận: ' + rewardLine(r.reward, app.data))
                }
              }, q.claimed ? 'Đã nhận' : q.done ? S.questClaim : 'Chưa xong')))))
      }

      // Rương ngày
      const doneCount = ql.quests.filter(q => q.done).length
      const chest = ql.chest
      const chestLocked = nowInfo.rewind && !chest.claimed
      body.appendChild(h('article', { class: ['chest-card', chest.available ? 'is-ready' : '', chest.claimed ? 'is-claimed' : ''], testid: 'daily-chest-card' },
        svgBox(icon('ruong'), 'chest-icon'),
        h('div', { class: 'chest-info' },
          h('b', null, S.dailyChest),
          h('p', { class: 'small' }, chest.claimed ? 'Đã mở hôm nay. Mai có rương mới!' : `Xong đủ 3 việc để mở (${doneCount}/3)`),
          rewardChips(chest.reward, app.data, { compact: true })),
        h('button', {
          class: ['btn', chest.available && !chestLocked ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'daily-chest',
          disabled: !chest.available || chestLocked || !!state.shift,
          onclick: () => {
            const r = claimDailyChest(app.state, app.nowInfo(), app.ctx)
            if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
            app.sound('chest')
            app.vibrate(30)
            done('Rương ngày: ' + rewardLine(r.reward, app.data))
          }
        }, chest.claimed ? 'Đã mở' : chestLocked ? 'Tạm khóa' : S.dailyChestOpen)))

      // Chuỗi nhiệm vụ (không gồm chuỗi sự kiện: xem ở thẻ sự kiện)
      const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.eventId)
      if (chains.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, S.chains))
        for (const c of chains) body.appendChild(chainCard(app, c, { onChange: () => render() }))
      }
      body.appendChild(h('p', { class: 'meta-hint small' }, 'Tiến độ tự đếm khi bán hàng. Việc xong mà quên nhận sẽ được gửi vào Hộp thư, giữ 7 ngày.'))
    }

    async function onReroll(q, ql) {
      if (!ql.reroll.free) {
        const ok = await app.modal({
          title: 'Đổi việc này?', text: `Tốn ${ql.reroll.cost} Muỗng Vàng để bốc việc khác cùng nhóm.`,
          actions: [{ label: 'Giữ việc', value: false, kind: 'ghost', testid: 'confirm-cancel' }, { label: 'Đổi việc', value: true, testid: 'confirm-ok' }]
        })
        if (!ok) return
      }
      const r = rerollQuest(app.state, q.index, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      app.sound('paper')
      done('Đã đổi sang việc mới', 'info')
    }

    render()
    return { unmount() {} }
  }
}
