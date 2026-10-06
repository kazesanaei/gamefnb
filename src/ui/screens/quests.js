// Màn "Việc hôm nay": 3 việc (Quầy, Bếp, Chất lượng) đổi lúc 04:00 giờ Việt Nam, nhận thưởng, đổi việc, Rương ngày;
// kèm các chuỗi nhiệm vụ đang làm (Dì Sáu, Anh Khoa).
// M5 Đợt 3 (gói M-C, bản 0.5.2): bảng ghim gỗ có biển phấn đồng hồ đặt lại; mỗi việc là tờ giấy ghim có hình loại việc
// (xe đẩy / bếp / sao), thanh tiến độ kiểu game, phần thưởng thành ô vật phẩm có hình, nút "Nhận" bánh kẹo (xu / muỗng bay
// về viên ví khi nhận), nút đổi việc có hình mũi tên; Rương ngày là rương to (đồng → vàng khi đủ 3 việc → mở) có quầng sáng,
// mở thì rương nảy, quà bung ra bay về ví. Hiệu ứng chỉ kích theo SỰ KIỆN bấm (nhân bản rồi bay: lấy khung nút trước khi vẽ
// lại), vẽ lại không phát lại. Không đổi luật, tiền, phần thưởng. Giữ testid / data-* / chữ mà e2e và tour bám vào
// (quest-<i> data-id/progress/target, quest-claim-<i> "Đã nhận", quest-reroll-<i>, daily-chest-card, daily-chest).
import { h, svgBox } from '../dom.js'
import { metaArt } from '../art/meta.js'
import { SCENE_ICONS } from '../art/scene.js'
import { questList, claimQuest, claimDailyChest, rerollQuest, questDef, ensureDaily } from '../../core/quests.js'
import { chainStatus } from '../../core/chains.js'
import { nextResetMs } from '../../core/clock.js'
import { formatVND, formatK } from '../format.js'
import {
  screenHead, rewardChips, rewardLine, rewardParts, partArt, reasonText, progressBar, durationText, rewindNote, celebrateReward
} from '../components/meta-ui.js'
import { chainCard } from '../components/chain-card.js'
import { chestOpen } from '../vfx.js'
import { LOCK_SVG } from '../components/checkin-popup.js'

// Hình loại việc (to, có viền mực): Quầy = xe đẩy, Bếp = chảo trên bếp, Chất lượng = sao.
const GROUP_ART = Object.freeze({ quay: 'tab_quay', bep: 'tab_bep', chat_luong: 'hud_sao' })

/** Hình loại việc theo nhóm (quay / bep / chat_luong); nhóm lạ → sao. Thuần. */
export function groupArt(group) {
  return SCENE_ICONS[GROUP_ART[group]] || SCENE_ICONS.hud_sao || metaArt('sao_lon')
}

/** Rương ngày theo trạng thái → id hình meta.js: đã mở → rương mở, đủ việc → rương vàng, chưa đủ → rương đồng. Thuần. */
export function chestArtId(chest) {
  if (chest && chest.claimed) return 'ruong_mo'
  if (chest && chest.available) return 'ruong_vang'
  return 'ruong_dong'
}

// Mũi tên đổi việc (nét mực, không chữ).
const REROLL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M19.2 9.4A7.6 7.6 0 0 0 5.6 7" stroke="#fff" stroke-width="5"/><path d="M4.8 14.6A7.6 7.6 0 0 0 18.4 17" stroke="#fff" stroke-width="5"/>' +
  '<path d="M19.2 9.4A7.6 7.6 0 0 0 5.6 7" stroke="#3a2618" stroke-width="2.6"/><path d="M4.8 14.6A7.6 7.6 0 0 0 18.4 17" stroke="#3a2618" stroke-width="2.6"/>' +
  '<path d="M5.4 2.6v4.6H10" stroke="#3a2618" stroke-width="2.6"/><path d="M18.6 21.4v-4.6H14" stroke="#3a2618" stroke-width="2.6"/></g></svg>'

export default {
  mount(root, app) {
    const S = app.data.STRINGS.meta
    const el = h('section', { class: 'meta-screen quests-screen', testid: 'screen-quests' })
    root.appendChild(el)
    // hiệu ứng một lần sau lần vẽ kế tiếp (đặt ngay trước render() trong lúc bấm; render() dùng rồi xóa)
    let justClaimed = -1
    let justOpened = false
    let destroyed = false

    function done(msg, kind = 'good', icon = '') {
      if (msg) app.toast(msg, { kind, icon: icon || undefined })
      app.saveNow()
      render()
    }

    // Toast nhận quà: hình mẩu thưởng đầu tiên + một dòng chữ (đọc được cả khi giảm chuyển động).
    function rewardToast(prefix, reward) {
      const p = rewardParts(reward, app.data)[0]
      done(prefix + rewardLine(reward, app.data), 'good', p ? partArt(p) : '')
    }

    function questNote(q, ql, state, settings) {
      const def = questDef(app.ctx, q.id) || {}
      const money = !!def.money
      // tiền: số gọn "72,5k / 145k" (đủ chỗ ở màn hẹp), số đủ ở title
      const num = money ? `${formatK(q.progress)} / ${formatK(q.target)}` : `${q.progress}/${q.target}`
      const numFull = money ? `${formatVND(q.progress)} / ${formatVND(q.target)}` : num
      const paused = def.assist && settings[def.assist]
      const claimTxt = q.claimed ? 'Đã nhận' : q.done ? S.questClaim : 'Chưa xong'
      const claimBtn = h('button', {
        class: ['btn', 'btn-small', 'quest-claim', q.claimed ? 'is-claimed' : q.canClaim ? 'btn-primary' : 'btn-ghost', justClaimed === q.index ? 'is-stamping' : ''],
        type: 'button', testid: 'quest-claim-' + q.index,
        disabled: !q.canClaim || !!state.shift,
        'aria-label': q.claimed ? 'Đã nhận thưởng' : q.canClaim ? 'Nhận thưởng: ' + rewardLine(q.reward, app.data) : null,
        onclick: ev => onClaim(q, ev)
      }, q.claimed ? svgBox(metaArt('dau_tick'), 'quest-claim-tick') : null, h('span', { class: 'quest-claim-text' }, claimTxt))
      const reroll = q.claimed ? null : h('button', {
        class: ['btn', 'btn-ghost', 'btn-small', 'quest-reroll', ql.reroll.free ? 'is-free' : 'has-cost'], type: 'button', testid: 'quest-reroll-' + q.index,
        disabled: q.done || (!ql.reroll.free && (state.goldSpoons || 0) < ql.reroll.cost),
        'aria-label': ql.reroll.free ? 'Đổi việc (miễn phí)' : `Đổi việc · ${ql.reroll.cost} Muỗng Vàng`,
        title: ql.reroll.free ? 'Đổi việc (miễn phí)' : `Đổi việc · ${ql.reroll.cost} Muỗng Vàng`,
        onclick: () => onReroll(q, ql)
      },
      svgBox(REROLL_SVG, 'quest-reroll-ico'), h('span', null, 'Đổi'),
      ql.reroll.free ? h('span', { class: 'quest-reroll-free' }, 'miễn phí')
        : h('span', { class: 'quest-reroll-cost', 'aria-hidden': 'true' }, svgBox(metaArt('muong_vang'), 'quest-reroll-spoon'), String(ql.reroll.cost)))
      return h('article', {
        class: ['quest-card', 'qs-note', 'g-paper-meta', 'g-paper-meta--pin', q.done ? 'is-done' : '', q.claimed ? 'is-claimed' : '', q.canClaim ? 'g-claim-meta' : ''],
        testid: 'quest-' + q.index, dataset: { id: q.id, progress: q.progress, target: q.target, group: q.group }
      },
      h('span', { class: 'qs-type' }, svgBox(groupArt(q.group), 'quest-icon'),
        q.done ? svgBox(metaArt('dau_tick'), 'qs-type-tick') : null),
      h('div', { class: 'quest-main' },
        h('p', { class: 'quest-text' }, h('span', { class: 'quest-group g-' + q.group }, q.groupName), ' ', q.text)),
      q.claimed ? null : h('div', { class: 'quest-prog' }, progressBar(q.progress, q.target, { label: q.text }), h('span', { class: 'quest-num', title: numFull }, num)),
      paused ? h('p', { class: 'small quest-paused' }, `Đang bật ${def.assist === 'assistCash' ? 'Hỗ trợ tính tiền' : 'Hỗ trợ thao tác'} nên việc này tạm không đếm.`) : null,
      h('div', { class: 'quest-foot' },
        q.claimed ? null : rewardChips(q.reward, app.data, { compact: true, slots: true }),
        h('div', { class: 'quest-btns' }, reroll, claimBtn)))
    }

    function chestCard(ql, nowInfo, state, left) {
      const chest = ql.chest
      const doneCount = ql.quests.filter(q => q.done).length
      const total = ql.quests.length || 3
      const chestLocked = nowInfo.rewind && !chest.claimed
      const ready = chest.available && !chestLocked && !state.shift
      const pips = []
      for (let i = 0; i < total; i++) {
        const ok = i < doneCount
        pips.push(h('span', { class: ['chest-pip', ok ? 'is-done' : ''] }, ok ? svgBox(metaArt('dau_tick'), 'chest-pip-tick') : null))
      }
      const btnText = chest.claimed ? 'Đã mở' : chestLocked ? 'Tạm khóa' : 'Mở rương'
      return h('article', {
        class: ['chest-card', 'g-board-meta', chest.available ? 'is-ready' : '', chest.claimed ? 'is-claimed' : '', chestLocked ? 'is-locked' : ''],
        testid: 'daily-chest-card', dataset: { state: chest.claimed ? 'claimed' : chestLocked ? 'locked' : chest.available ? 'ready' : 'waiting' }
      },
      h('span', { class: ['chest-stage', justOpened ? 'is-opening' : ''] },
        h('span', { class: 'chest-rays', 'aria-hidden': 'true' }),
        svgBox(metaArt(chestArtId(chest)), 'chest-icon')),
      h('div', { class: 'chest-info g-board-meta-in' },
        h('div', { class: 'chest-top' },
          h('b', { class: 'chest-title' }, S.dailyChest),
          h('span', { class: 'chest-pips', role: 'img', 'aria-label': `Xong ${doneCount}/${total} việc` }, pips)),
        h('p', { class: 'chest-sub' }, chest.claimed ? `Đã mở hôm nay · rương mới sau ${durationText(left)}`
          : chest.available ? 'Đủ 3 việc rồi, mở rương nhận quà!' : `Xong đủ ${total} việc để mở (${doneCount}/${total})`),
        h('div', { class: 'chest-row' },
          chest.claimed ? null : rewardChips(chest.reward, app.data, { compact: true, slots: true }),
          h('button', {
            class: ['btn', 'chest-btn', ready ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'daily-chest',
            disabled: !chest.available || chestLocked || !!state.shift,
            onclick: ev => onOpenChest(ev)
          }, chestLocked ? svgBox(LOCK_SVG, 'chest-btn-ico') : null, btnText))))
    }

    function render() {
      if (destroyed) return
      const state = app.state
      const nowInfo = app.nowInfo()
      ensureDaily(state, nowInfo, app.ctx)
      const ql = questList(state, app.ctx)
      const left = nextResetMs(nowInfo.trusted) - nowInfo.trusted
      el.textContent = ''
      el.appendChild(screenHead(app, { title: S.quests, sub: 'Đủ 3 việc là mở được Rương ngày', icon: 'lich', backLabel: '‹ Chuẩn bị', help: true }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      const body = h('div', { class: 'meta-body qs-body' })
      el.appendChild(body)
      if (state.shift) body.appendChild(h('p', { class: 'card card-warn small' }, reasonText(app, 'dang_ban')))

      const settings = state.settings || {}
      // bảng ghim gỗ: biển phấn đồng hồ đặt lại + 3 tờ việc
      body.appendChild(h('section', { class: 'qs-board g-board-meta', 'aria-label': S.quests },
        h('div', { class: 'g-board-meta-title qs-clock', role: 'timer', 'aria-label': `${S.questResetAt}, còn ${durationText(left)}` },
          svgBox(SCENE_ICONS.hud_gio || metaArt('o_lich'), 'qs-clock-ico'),
          h('span', null, `Việc mới sau ${durationText(left)}`)),
        h('div', { class: 'qs-notes' }, ql.quests.map(q => questNote(q, ql, state, settings)))))

      // Rương ngày: rương to trên kệ gỗ
      body.appendChild(chestCard(ql, nowInfo, state, left))
      justClaimed = -1
      justOpened = false

      // Chuỗi nhiệm vụ (không gồm chuỗi sự kiện: xem ở thẻ sự kiện)
      const chains = chainStatus(state, nowInfo, app.ctx).filter(c => !c.eventId)
      if (chains.length) {
        body.appendChild(h('h2', { class: 'meta-section' }, S.chains))
        for (const c of chains) body.appendChild(chainCard(app, c, { onChange: () => render() }))
      }
      body.appendChild(h('p', { class: 'meta-hint small' }, 'Tiến độ tự đếm khi bán hàng. Việc xong mà quên nhận sẽ được gửi vào Hộp thư, giữ 7 ngày.'))
    }

    // Nhận thưởng một việc: lấy khung nút TRƯỚC khi vẽ lại, vẽ lại (nút thành dấu "Đã nhận"), rồi xu / sao bay về ví.
    function onClaim(q, ev) {
      const btn = ev && ev.currentTarget
      const rect = btn && btn.getBoundingClientRect ? btn.getBoundingClientRect() : null
      const r = claimQuest(app.state, q.index, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      app.sound('coin')
      justClaimed = q.index
      rewardToast('Nhận: ', r.reward)
      if (rect) celebrateReward(app, rect, r.reward)
    }

    // Mở Rương ngày: rương mở (nảy + sáng) rồi quà bung ra bay về ví.
    function onOpenChest(ev) {
      const btn = ev && ev.currentTarget
      const card = btn && btn.closest ? btn.closest('[data-testid="daily-chest-card"]') : null
      const art = card ? card.querySelector('.chest-icon') : null
      let rect = null
      try { rect = (art || btn).getBoundingClientRect() } catch { rect = null }
      const r = claimDailyChest(app.state, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      app.sound('chest')
      app.vibrate(30)
      justOpened = true
      rewardToast('Rương ngày: ', r.reward)
      const fresh = el.querySelector('[data-testid="daily-chest-card"] .chest-icon')
      if (fresh && app.vfx) chestOpen(app.vfx, fresh).then(() => { if (!destroyed && rect) celebrateReward(app, rect, r.reward) })
      else if (rect) celebrateReward(app, rect, r.reward)
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

    // đồng hồ đặt lại: chỉ đổi chữ trên biển phấn mỗi 30 giây (không vẽ lại cả màn); qua 04:00 thì vẽ lại (việc mới)
    let dayKey = app.nowInfo().dayKey
    const tick = setInterval(() => {
      if (destroyed || !app.state) return
      const ni = app.nowInfo()
      if (ni.dayKey !== dayKey) { dayKey = ni.dayKey; render(); return }
      const clock = el.querySelector('.qs-clock')
      const span = clock && clock.querySelector('span:last-child')
      const left = nextResetMs(ni.trusted) - ni.trusted
      if (span) span.textContent = `Việc mới sau ${durationText(left)}`
      if (clock) clock.setAttribute('aria-label', `${S.questResetAt}, còn ${durationText(left)}`)
    }, 30000)

    render()
    return { unmount() { destroyed = true; clearInterval(tick) } }
  }
}
