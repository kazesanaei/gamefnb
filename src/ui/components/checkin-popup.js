// Bảng điểm danh 7 ô: hiện ở lần mở game đầu tiên mỗi ngày thật (đổi lúc 04:00 giờ Việt Nam), nhận bằng 1 chạm.
// Lỡ ngày không mất ô. Giờ máy bị lùi → khóa nhận, nhắc nhẹ.
// M5 Đợt 3 (gói M-C, bản 0.5.2): mỗi ô là một tờ lịch (dải đỏ "Ngày N" + hình quà có số lượng), ô 7 là hộp quà lớn;
// ô đã nhận có dấu tick đóng dấu (ô vừa nhận đóng dấu MỘT LẦN), ô hôm nay viền vàng sáng + nảy một lần khi bảng mở; dòng
// "Hôm nay" ghi rõ quà; nhận xong bảng tự đóng rồi quà bung ra bay về viên ví / Muỗng Vàng ở màn dưới (hiệu ứng chạy SAU
// khi bảng đóng vì lớp hiệu ứng nằm dưới lớp hộp thoại). Giờ máy lùi: dòng nhắc có ổ khóa, nút "Tạm khóa".
// Giữ testid checkin-popup / checkin-claim (chữ "Ngày N") / checkin-close / checkin-slot-<i> (data-claimed) / checkin-note
// (lớp đúng bằng 'ck-note' hoặc 'ck-note is-warn', chữ chứa "lùi" khi lùi giờ).
import { h, svgBox } from '../dom.js'
import { metaArt } from '../art/meta.js'
import { checkinStatus, claimCheckin } from '../../core/checkin.js'
import { rewardLine, rewardParts, partArt, reasonText, celebrateReward } from './meta-ui.js'
import { formatVND } from '../format.js'

const AUTO_CLOSE_MS = 1100

// Ổ khóa nhỏ (giờ máy lùi; Việc hôm nay dùng chung cho nút Rương ngày tạm khóa).
export const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke="#3a2618" stroke-width="2" stroke-linejoin="round">' +
  '<path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3" fill="none" stroke-width="2.6"/><rect x="4.5" y="10.5" width="15" height="11" rx="3" fill="#f7b928"/>' +
  '<circle cx="12" cy="15.4" r="1.6" fill="#3a2618" stroke="none"/><path d="M12 16.4v2.2" stroke-width="2"/></g></svg>'

// Thứ tự nổi bật của mẩu thưởng trong ô lịch: hiện vật có tên trước, rồi Muỗng Vàng, tiền, danh tiếng.
const ORDER = ['cosmetic', 'title', 'item', 'upgrade', 'recipe', 'unlock', 'fragment', 'rare', 'gold', 'money', 'rep', 'tem', 'tip']

/**
 * Các mẩu quà hiện trong một ô lịch (tối đa `max`), mẩu nổi bật nhất trước: [{ kind, art (id meta.js hoặc null), icon, qty }].
 * qty: "+10" (Muỗng Vàng), "+20k" (tiền), "×2" (hiện vật nhiều), '' (một hiện vật). Thuần (không DOM).
 */
export function slotGifts(reward, data, max = 2) {
  const parts = rewardParts(reward || {}, data || {})
  return parts.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, max)
    .map(p => ({ kind: p.kind, art: p.art, icon: p.icon, qty: p.qty, text: p.text }))
}

// Chữ gọn cho ô điểm danh: "10 Muỗng Vàng + Viền biển xe".
export function slotText(reward, data) {
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
  let flyFx = null   // { rect, reward }: quà bay về ví sau khi bảng đóng
  const shown = app.modal({
    testid: 'checkin-popup',
    className: 'checkin-modal',
    dismissible: true,
    blocking: true,
    render(close) {
      let result = null
      const total = () => (app.state.checkin ? app.state.checkin.total || 0 : 0)
      const sub = h('p', { class: 'ck-sub' }, `${S.checkin} · đã nhận ${total()} ngày`)
      const grid = h('ol', { class: 'ck-grid' })
      const last = st.slots.length - 1
      const paint = (status, { pop = false, stamp = -1 } = {}) => {
        grid.textContent = ''
        for (const s of status.slots) {
          const big = s.index === last
          const today = s.isNext && status.canClaim
          const gifts = big ? [] : slotGifts(s.reward, app.data, 2)
          const dayTxt = S.checkinSlot.replace('{n}', String(s.index + 1))
          grid.appendChild(h('li', {
            class: ['ck-slot', s.claimed ? 'is-claimed' : '', s.isNext ? 'is-next' : '', today ? 'is-today' : '', big ? 'is-big' : '',
              pop && today ? 'is-pop' : '', stamp === s.index ? 'is-stamping' : '', gifts.length > 1 && !big ? 'has-two' : ''],
            testid: 'checkin-slot-' + s.index, dataset: { claimed: s.claimed ? 'true' : 'false' },
            'aria-label': `${dayTxt}: ${slotText(s.reward, app.data)}${s.claimed ? ' · đã nhận' : ''}`
          },
          h('span', { class: 'ck-day', 'aria-hidden': 'true' }, dayTxt),
          big
            ? h('span', { class: 'ck-big', 'aria-hidden': 'true' },
              svgBox(metaArt('ngay_7'), 'ck-big-art'),
              h('span', { class: 'ck-big-text' },
                h('b', { class: 'ck-label' }, s.reward.label || 'Hộp quà lớn')))
            : h('span', { class: 'ck-gifts', 'aria-hidden': 'true' }, gifts.map(g => giftEl(g))),
          s.claimed ? svgBox(metaArt('dau_tick'), 'ck-check') : null))
        }
      }
      const giftEl = g => h('span', { class: ['ck-gift', 'ck-' + g.kind] },
        svgBox(partArt(g), 'ck-icon'), g.qty ? h('b', { class: 'ck-qty' }, g.qty) : null)
      paint(st, { pop: true })

      // dòng quà hôm nay (hoặc quà ô kế tiếp khi đã nhận hôm nay)
      const nextSlot = st.slots.find(s => s.isNext)
      const prize = h('p', { class: 'ck-prize' })
      const setPrize = (label, slot) => {
        prize.textContent = ''
        if (!slot) { prize.hidden = true; return }
        prize.hidden = false
        const g = slotGifts(slot.reward, app.data, 1)[0]
        if (g) prize.appendChild(svgBox(partArt(g), 'ck-prize-ico'))
        prize.appendChild(h('span', null, h('b', null, label), ' ' + slotText(slot.reward, app.data)))
      }
      if (st.canClaim && nextSlot) setPrize(`Hôm nay (${S.checkinSlot.replace('{n}', String(nextSlot.index + 1))}):`, nextSlot)
      else if (st.reason === 'da_nhan' && nextSlot) setPrize('Lần sau:', nextSlot)
      else setPrize('', null)

      const note = h('p', { class: 'ck-note', testid: 'checkin-note' })
      const setNote = (text, warn) => {
        note.textContent = ''
        if (warn) note.appendChild(svgBox(LOCK_SVG, 'ck-note-ico'))
        note.appendChild(h('span', null, text))
      }
      setNote(st.reason === 'lui_gio' ? S.rewindLocked : st.reason === 'da_nhan' ? S.checkinDone : S.checkinKeep, st.reason === 'lui_gio')
      if (st.reason === 'lui_gio') note.classList.add('is-warn')

      const claimBtn = h('button', {
        class: 'btn btn-primary btn-big', type: 'button', testid: 'checkin-claim', disabled: !st.canClaim,
        onclick: () => {
          const slotEl = grid.querySelector(`[data-testid="checkin-slot-${nextSlot ? nextSlot.index : 0}"]`)
          let rect = null
          try { rect = slotEl ? slotEl.getBoundingClientRect() : null } catch { rect = null }
          const r = claimCheckin(app.state, app.nowInfo(), app.ctx)
          if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
          result = { claimed: true, reward: r.reward }
          flyFx = { rect, reward: r.reward }
          app.sound(r.index === 6 ? 'chest' : 'stamp')   // ô 7 là Rương
          app.vibrate(20)
          app.saveNow()
          // vẽ ô vừa nhận (vòng vừa xong thì giữ bảng cũ, đánh dấu cả 7 ô); ô vừa nhận đóng dấu một lần
          const after = st.slots.map(s => ({ ...s, claimed: s.claimed || s.index === r.index, isNext: false }))
          paint({ slots: after, canClaim: false }, { stamp: r.index })
          claimBtn.disabled = true
          claimBtn.classList.add('is-done')
          claimBtn.textContent = ''
          claimBtn.appendChild(svgBox(metaArt('dau_tick'), 'ck-claim-tick'))
          claimBtn.appendChild(h('span', null, 'Đã nhận: ' + rewardLine(r.reward, app.data)))
          setNote(S.checkinDone, false)
          setPrize('', null)
          sub.textContent = `${S.checkin} · đã nhận ${total()} ngày`
          closeBtn.textContent = 'Đóng'
          if (typeof opts.onClaim === 'function') opts.onClaim(r.reward)
          setTimeout(() => close(result), AUTO_CLOSE_MS)
        }
      },
      st.reason === 'lui_gio' ? svgBox(LOCK_SVG, 'ck-claim-ico') : null,
      st.canClaim && nextSlot ? `${S.checkinClaim}: ${S.checkinSlot.replace('{n}', String(nextSlot.index + 1))}` : st.reason === 'lui_gio' ? 'Tạm khóa' : reasonText(app, st.reason))
      const closeBtn = h('button', { class: 'btn btn-ghost', type: 'button', testid: 'checkin-close', onclick: () => close(result) }, st.canClaim ? 'Để sau' : 'Đóng')
      return h('div', { class: ['ck-body', st.reason === 'lui_gio' ? 'is-locked' : ''] },
        h('div', { class: 'ck-head' }, svgBox(metaArt('diem_danh'), 'ck-head-icon'),
          h('div', { class: 'ck-head-text' }, h('h2', { class: 'modal-title ck-title' }, st.roundName || S.checkin), sub)),
        grid, prize, note,
        h('div', { class: 'ck-actions' }, claimBtn, closeBtn))
    }
  })
  // bảng đã đóng (tự đóng, bấm Đóng hay chạm nền): quà bay về ví ở màn dưới, sau khi màn gọi vẽ lại (setTimeout).
  return shown.then(v => {
    if (flyFx && flyFx.rect) {
      const { rect, reward } = flyFx
      flyFx = null
      setTimeout(() => {
        if (reward.money || reward.gold) app.sound('coin')
        celebrateReward(app, rect, reward)
      }, 60)
    }
    return v
  })
}
