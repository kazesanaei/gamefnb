// Hộp thư: quà hệ thống (chào mừng, phiên bản mới, quà lễ, quà đời thường, việc quên nhận, review muộn, sự kiện).
// Mới nhất ở trên, chấm đỏ thư chưa xem, "Nhận tất cả", hạn nhận hiện rõ.
// M5 Đợt 3 (gói M-C, bản 0.5.2): mỗi thư là một phong bì (hình thư đóng / thư đã mở, viền thư máy bay cho thư mới, ô quà
// nhỏ ở góc phong bì khi thư có quà); chạm để mở thành tờ giấy kẻ dòng có tem và dấu bưu điện; quà đính kèm là ô vật phẩm
// có hình; nhận quà thì xu / muỗng bay về viên ví (nhân bản rồi bay: lấy khung nút trước khi vẽ lại). "Nhận tất cả" là nút
// vàng có hình hộp quà ở kệ đầu danh sách. Không đổi luật, quà, hạn. Giữ testid screen-mail, mail-list, mail-item-<id>,
// mail-claim-<id> (thẻ button), mail-claim-all.
import { h, svgBox } from '../dom.js'
import { metaArt } from '../art/meta.js'
import { mailList, mailBadge, claimMail, claimAllMail, markMailRead } from '../../core/mail.js'
import { screenHead, rewardChips, rewardLine, rewardParts, partArt, reasonText, rewindNote, celebrateReward } from '../components/meta-ui.js'
import { mergeRewards } from '../components/chain-card.js'

// Hình nhỏ ở dấu bưu điện theo loại thư (meta.js).
const KIND_ART = Object.freeze({
  chao_mung: 'qua', phien_ban: 'thu', den_bu: 'qua', le: 'qua', doi_thuong: 'xu', nhiem_vu: 'viec_hom_nay', review: 'sao_lon', su_kien: 'su_kien', moc: 'cup'
})

/** Hình phong bì: thư mới (chưa đọc / quà chưa nhận) → thư đóng; còn lại → thư đã mở. Thuần. */
export function envelopeArt(m) {
  const fresh = m && (m.hasReward ? !m.claimed : !m.read)
  return fresh ? 'thu' : 'thu_mo'
}

export default {
  mount(root, app) {
    const S = app.data.STRINGS.meta
    const K = (app.data.MAIL_CONFIG && app.data.MAIL_CONFIG.kinds) || {}
    const open = new Set()
    let justClaimed = new Set()
    const el = h('section', { class: 'meta-screen mail-screen', testid: 'screen-mail' })
    root.appendChild(el)
    // đã mở Hộp thư: thông báo "Vừa có thư mới" (bật ở màn Chuẩn bị) thừa và che đầu màn → cất đi
    if (app.overlay) for (const t of app.overlay.querySelectorAll('[data-testid="mail-toast"]')) t.remove()

    function toastReward(prefix, reward) {
      const p = rewardParts(reward, app.data)[0]
      app.toast(prefix + rewardLine(reward, app.data), { kind: 'good', icon: p ? partArt(p) : undefined })
    }

    function render() {
      const state = app.state
      const nowInfo = app.nowInfo()
      const list = mailList(state, nowInfo).filter(m => !m.expired)
      const claimable = list.filter(m => m.hasReward && !m.claimed)
      const fresh = mailBadge(state, nowInfo)
      el.textContent = ''
      el.appendChild(screenHead(app, { title: S.mailbox, sub: `${fresh} thư mới · quà giữ tối đa 30 ngày`, icon: 'thu', backLabel: '‹ Chuẩn bị', help: true }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      // kệ đầu danh sách: số thư + nút vàng "Nhận tất cả"
      el.appendChild(h('div', { class: ['mail-bar', claimable.length ? 'has-gift' : ''] },
        h('span', { class: 'mail-count' },
          svgBox(metaArt(claimable.length ? 'qua' : 'thu_mo'), 'mail-count-ico'),
          h('span', { class: 'mail-count-text' },
            h('b', null, `${list.length} thư`),
            h('small', null, claimable.length ? `${claimable.length} thư có quà` : 'Không có quà chờ'))),
        h('button', {
          class: ['btn', 'btn-small', 'mail-claim-all', claimable.length ? 'btn-secondary' : 'btn-ghost'], type: 'button', testid: 'mail-claim-all',
          disabled: !claimable.length || !!state.shift,
          onclick: ev => onClaimAll(ev)
        }, svgBox(metaArt('qua'), 'mail-claim-all-ico'), h('span', null, claimable.length ? `${S.claimAll} (${claimable.length})` : S.claimAll))))
      const body = h('div', { class: 'meta-body mail-list', testid: 'mail-list' })
      el.appendChild(body)
      if (!list.length) {
        body.appendChild(h('div', { class: 'mail-empty g-paper-meta' },
          svgBox(metaArt('hop_thu'), 'mail-empty-icon'),
          h('b', null, S.mailEmpty),
          h('p', null, 'Thư của Dì Sáu, quà lễ và thư báo bản mới sẽ nằm ở đây.')))
        justClaimed = new Set()
        return
      }
      for (const m of list) body.appendChild(mailItem(m, nowInfo))
      justClaimed = new Set()
    }

    function mailItem(m, nowInfo) {
      const isOpen = open.has(m.id)
      const fresh = m.hasReward ? !m.claimed : !m.read
      const gift = m.hasReward && !m.claimed
      const toggle = () => {
        if (isOpen) open.delete(m.id)
        else { open.add(m.id); if (!m.read) { markMailRead(app.state, m.id); app.save() } }
        app.sound('paper')
        render()
      }
      const lockedHoliday = m.kind === 'le' && nowInfo.rewind && !m.claimed
      const kindName = K[m.kind] || 'Thư'
      const due = m.claimed ? 'đã nhận' : S.mailExpires.replace('{n}', String(m.daysLeft))
      return h('article', {
        class: ['mail-item', fresh ? 'is-new' : '', m.claimed ? 'is-claimed' : '', isOpen ? 'is-open' : '', gift ? 'has-gift' : ''],
        testid: 'mail-item-' + m.id, dataset: { kind: m.kind }
      },
      h('button', { class: 'mail-head', type: 'button', 'aria-expanded': String(isOpen), onclick: toggle },
        h('span', { class: 'mail-env' }, svgBox(metaArt(envelopeArt(m)), 'mail-icon'),
          gift ? svgBox(metaArt('qua'), 'mail-env-gift') : null),
        h('span', { class: 'mail-titles' },
          h('b', null, m.title),
          h('small', null, `${kindName} · ${due}`)),
        fresh ? h('span', { class: 'red-dot', 'aria-label': 'Thư mới' }) : null,
        h('span', { class: 'mail-chev', 'aria-hidden': 'true' })),
      isOpen ? h('div', { class: 'mail-letter g-paper-meta g-paper-meta--lined' },
        h('span', { class: 'mail-stamp', 'aria-hidden': 'true' }, svgBox(metaArt('tem'), 'mail-stamp-art'),
          h('span', { class: 'mail-postmark' }, svgBox(metaArt(KIND_ART[m.kind] || 'thu'), 'mail-postmark-ico'))),
        h('p', { class: 'mail-body' }, m.body)) : null,
      m.hasReward ? h('div', { class: 'mail-foot' },
        h('span', { class: 'mail-gift' }, rewardChips(m.reward, app.data, { compact: true })),
        h('button', {
          class: ['btn', 'btn-small', 'mail-claim', m.claimed ? 'is-claimed' : lockedHoliday ? 'btn-ghost' : 'btn-primary', justClaimed.has(m.id) ? 'is-stamping' : ''],
          type: 'button', testid: 'mail-claim-' + m.id,
          disabled: m.claimed || lockedHoliday || !!app.state.shift,
          onclick: ev => onClaim(m, ev)
        }, m.claimed ? svgBox(metaArt('dau_tick'), 'mail-claim-tick') : null,
        m.claimed ? 'Đã nhận' : lockedHoliday ? 'Tạm khóa' : S.mailClaim)) : null)
    }

    function onClaim(m, ev) {
      const btn = ev && ev.currentTarget
      let rect = null
      try { rect = btn ? btn.getBoundingClientRect() : null } catch { rect = null }
      const r = claimMail(app.state, m.id, app.nowInfo(), app.ctx)
      if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
      app.sound('coin')
      toastReward('Nhận: ', r.reward)
      app.saveNow()
      justClaimed = new Set([m.id])
      render()
      if (rect) celebrateReward(app, rect, r.reward)
    }

    function onClaimAll(ev) {
      const btn = ev && ev.currentTarget
      let rect = null
      try { rect = btn ? btn.getBoundingClientRect() : null } catch { rect = null }
      const r = claimAllMail(app.state, app.nowInfo(), app.ctx)
      if (!r.count) { app.toast(r.skipped.length ? reasonText(app, r.skipped[0].reason) : S.mailEmpty, { kind: 'bad' }); return }
      app.sound('coin')
      app.vibrate(20)
      const skipped = r.skipped.length ? ` · ${r.skipped.length} thư chưa nhận được` : ''
      app.toast(`Đã nhận ${r.count} thư${skipped}`, { kind: 'good', icon: metaArt('qua') })
      app.saveNow()
      justClaimed = new Set((r.rewards || []).map(x => x.id))
      render()
      const merged = mergeRewards((r.rewards || []).map(x => x.reward || {}))
      if (rect) celebrateReward(app, rect, merged)
    }

    render()
    return { unmount() {} }
  }
}
