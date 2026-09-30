// Bảng điểm danh 7 ô: hiện ở lần mở game đầu tiên mỗi ngày thật (đổi lúc 04:00 giờ Việt Nam), nhận bằng 1 chạm.
// Lỡ ngày không mất ô. Giờ máy bị lùi → khóa nhận, nhắc nhẹ.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { checkinStatus, claimCheckin } from '../../core/checkin.js'
import { rewardLine, rewardParts, reasonText } from './meta-ui.js'
import { formatVND } from '../format.js'

const AUTO_CLOSE_MS = 1100

function slotIcon(reward) {
  if (reward.label) return 'ruong'
  if (reward.items) return Object.keys(reward.items)[0]
  if (reward.upgrade) return reward.upgrade
  const p = rewardParts(reward, {})[0]
  return p ? p.icon : 'muong_vang'
}

// Chữ gọn cho ô điểm danh: "10 Muỗng Vàng + Viền biển xe".
function slotText(reward, data) {
  const out = []
  if (reward.gold) out.push(`${reward.gold} Muỗng Vàng`)
  if (reward.money) out.push(formatVND(reward.money))
  for (const [id, n] of Object.entries(reward.items || {})) {
    const it = data.ITEMS && data.ITEMS[id]
    out.push((it ? it.name : id) + (n > 1 ? ` ×${n}` : ''))
  }
  if (reward.upgrade) out.push(rewardLine({ upgrade: reward.upgrade }, data))
  if (reward.cosmetic) out.push(reward.cosmetic === 'vien_khai_truong' ? 'Viền biển xe' : 'Đồ trang trí')
  if (reward.title) out.push('Danh hiệu')
  return out.join(' + ') || rewardLine(reward, data)
}

/**
 * Mở bảng điểm danh. Trả Promise<{claimed, reward}|null>.
 * opts.onClaim(reward): gọi sau khi nhận (để màn gọi vẽ lại).
 */
export function openCheckin(app, opts = {}) {
  const S = app.data.STRINGS.meta
  const nowInfo = app.nowInfo()
  const st = checkinStatus(app.state, nowInfo, app.ctx)
  return app.modal({
    testid: 'checkin-popup',
    className: 'checkin-modal',
    dismissible: true,
    blocking: true,
    render(close) {
      let result = null
      const subText = () => `${S.checkin} · đã nhận ${app.state.checkin ? app.state.checkin.total || 0 : 0} ngày`
      const sub = h('p', { class: 'muted small' }, subText())
      const grid = h('ol', { class: 'ck-grid' })
      const paint = status => {
        grid.textContent = ''
        for (const s of status.slots) {
          const big = s.index === status.slots.length - 1
          grid.appendChild(h('li', {
            class: ['ck-slot', s.claimed ? 'is-claimed' : '', s.isNext ? 'is-next' : '', big ? 'is-big' : ''],
            testid: 'checkin-slot-' + s.index, dataset: { claimed: s.claimed ? 'true' : 'false' }
          },
          h('span', { class: 'ck-day' }, S.checkinSlot.replace('{n}', String(s.index + 1))),
          svgBox(icon(slotIcon(s.reward)), 'ck-icon'),
          s.reward.label ? h('b', { class: 'ck-label' }, s.reward.label) : null,
          h('span', { class: 'ck-reward' }, slotText(s.reward, app.data)),
          s.claimed ? h('span', { class: 'ck-check', 'aria-label': 'Đã nhận' }, '✓') : null))
        }
      }
      paint(st)
      const note = h('p', { class: 'ck-note', testid: 'checkin-note' },
        st.reason === 'lui_gio' ? S.rewindLocked : st.reason === 'da_nhan' ? S.checkinDone : S.checkinKeep)
      if (st.reason === 'lui_gio') note.classList.add('is-warn')
      const nextSlot = st.slots.find(s => s.isNext)
      const claimBtn = h('button', {
        class: 'btn btn-primary btn-big', type: 'button', testid: 'checkin-claim', disabled: !st.canClaim,
        onclick: () => {
          const r = claimCheckin(app.state, app.nowInfo(), app.ctx)
          if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
          result = { claimed: true, reward: r.reward }
          app.sound('coin')
          app.vibrate(20)
          app.saveNow()
          // vẽ ô vừa nhận (vòng vừa xong thì giữ bảng cũ, đánh dấu cả 7 ô)
          const after = st.slots.map(s => ({ ...s, claimed: s.claimed || s.index === r.index, isNext: false }))
          paint({ slots: after })
          claimBtn.disabled = true
          claimBtn.classList.add('is-done')
          claimBtn.textContent = 'Đã nhận: ' + rewardLine(r.reward, app.data)
          note.textContent = S.checkinDone
          sub.textContent = subText()
          closeBtn.textContent = 'Đóng'
          if (typeof opts.onClaim === 'function') opts.onClaim(r.reward)
          setTimeout(() => close(result), AUTO_CLOSE_MS)
        }
      }, st.canClaim && nextSlot ? `${S.checkinClaim}: ${S.checkinSlot.replace('{n}', String(nextSlot.index + 1))}` : st.reason === 'lui_gio' ? 'Tạm khóa' : reasonText(app, st.reason))
      const closeBtn = h('button', { class: 'btn btn-ghost', type: 'button', testid: 'checkin-close', onclick: () => close(result) }, st.canClaim ? 'Để sau' : 'Đóng')
      return h('div', { class: 'ck-body' },
        h('div', { class: 'ck-head' }, svgBox(icon('lich'), 'ck-head-icon'),
          h('div', null, h('h2', { class: 'modal-title ck-title' }, st.roundName || S.checkin), sub)),
        grid, note,
        h('div', { class: 'ck-actions' }, claimBtn, closeBtn))
    }
  })
}
