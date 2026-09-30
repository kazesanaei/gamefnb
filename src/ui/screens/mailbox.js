// Hộp thư: quà hệ thống (chào mừng, phiên bản mới, quà lễ, quà đời thường, việc quên nhận, review muộn, sự kiện).
// Mới nhất ở trên, chấm đỏ thư chưa xem, "Nhận tất cả", hạn nhận hiện rõ.
import { h, svgBox } from '../dom.js'
import { icon } from '../art.js'
import { mailList, mailBadge, claimMail, claimAllMail, markMailRead } from '../../core/mail.js'
import { screenHead, rewardChips, rewardLine, reasonText, rewindNote } from '../components/meta-ui.js'

const KIND_ICON = { chao_mung: 'thu', phien_ban: 'thu', den_bu: 'ruong', le: 'danh_hieu', doi_thuong: 'lanh_luong', nhiem_vu: 'ruong', review: 'sao', su_kien: 'phan_trang', moc: 'danh_hieu' }

export default {
  mount(root, app) {
    const S = app.data.STRINGS.meta
    const K = (app.data.MAIL_CONFIG && app.data.MAIL_CONFIG.kinds) || {}
    const open = new Set()
    const el = h('section', { class: 'meta-screen mail-screen', testid: 'screen-mail' })
    root.appendChild(el)
    // đã mở Hộp thư: thông báo "Vừa có thư mới" (bật ở màn Chuẩn bị) thừa và che đầu màn → cất đi
    if (app.overlay) for (const t of app.overlay.querySelectorAll('[data-testid="mail-toast"]')) t.remove()

    function render() {
      const state = app.state
      const nowInfo = app.nowInfo()
      const list = mailList(state, nowInfo).filter(m => !m.expired)
      const claimable = list.filter(m => m.hasReward && !m.claimed)
      el.textContent = ''
      el.appendChild(screenHead(app, { title: S.mailbox, sub: `${mailBadge(state, nowInfo)} thư mới · quà giữ tối đa 30 ngày`, icon: 'thu', backLabel: '‹ Chuẩn bị' }))
      const rw = rewindNote(app, nowInfo)
      if (rw) el.appendChild(rw)
      el.appendChild(h('div', { class: 'mail-bar' },
        h('span', { class: 'small muted' }, `${list.length} thư`),
        h('button', {
          class: ['btn', 'btn-small', claimable.length ? 'btn-primary' : 'btn-ghost'], type: 'button', testid: 'mail-claim-all',
          disabled: !claimable.length || !!state.shift,
          onclick: () => {
            const r = claimAllMail(app.state, app.nowInfo(), app.ctx)
            if (!r.count) { app.toast(r.skipped.length ? reasonText(app, r.skipped[0].reason) : S.mailEmpty, { kind: 'bad' }); return }
            app.sound('coin')
            app.vibrate(20)
            const skipped = r.skipped.length ? ` · ${r.skipped.length} thư chưa nhận được` : ''
            app.toast(`Đã nhận ${r.count} thư${skipped}`, { kind: 'good' })
            app.saveNow()
            render()
          }
        }, claimable.length ? `${S.claimAll} (${claimable.length})` : S.claimAll)))
      const body = h('div', { class: 'meta-body mail-list', testid: 'mail-list' })
      el.appendChild(body)
      if (!list.length) {
        body.appendChild(h('div', { class: 'mail-empty' }, svgBox(icon('thu'), 'mail-empty-icon'), h('p', null, S.mailEmpty)))
        return
      }
      for (const m of list) body.appendChild(mailItem(m, nowInfo))
    }

    function mailItem(m, nowInfo) {
      const isOpen = open.has(m.id)
      const fresh = m.hasReward ? !m.claimed : !m.read
      const toggle = () => {
        if (isOpen) open.delete(m.id)
        else { open.add(m.id); if (!m.read) { markMailRead(app.state, m.id); app.save() } }
        render()
      }
      const lockedHoliday = m.kind === 'le' && nowInfo.rewind && !m.claimed
      return h('article', { class: ['mail-item', fresh ? 'is-new' : '', m.claimed ? 'is-claimed' : '', isOpen ? 'is-open' : ''], testid: 'mail-item-' + m.id, dataset: { kind: m.kind } },
        h('button', { class: 'mail-head', type: 'button', 'aria-expanded': String(isOpen), onclick: toggle },
          svgBox(icon(KIND_ICON[m.kind] || 'thu'), 'mail-icon'),
          h('span', { class: 'mail-titles' },
            h('b', null, m.title),
            h('small', null, `${K[m.kind] || 'Thư'} · ${m.claimed ? 'đã nhận' : S.mailExpires.replace('{n}', String(m.daysLeft))}`),
            isOpen ? null : h('span', { class: 'mail-preview' }, m.body)),
          fresh ? h('span', { class: 'red-dot', 'aria-label': 'Thư mới' }) : null),
        isOpen ? h('p', { class: 'mail-body' }, m.body) : null,
        m.hasReward ? h('div', { class: 'mail-foot' },
          rewardChips(m.reward, app.data, { compact: true }),
          h('button', {
            class: ['btn', 'btn-small', m.claimed ? 'btn-ghost' : 'btn-primary'], type: 'button', testid: 'mail-claim-' + m.id,
            disabled: m.claimed || lockedHoliday || !!app.state.shift,
            onclick: () => {
              const r = claimMail(app.state, m.id, app.nowInfo(), app.ctx)
              if (!r.ok) { app.toast(reasonText(app, r.reason), { kind: 'bad' }); return }
              app.sound('coin')
              app.toast('Nhận: ' + rewardLine(r.reward, app.data), { kind: 'good' })
              app.saveNow()
              render()
            }
          }, m.claimed ? 'Đã nhận' : lockedHoliday ? 'Tạm khóa' : S.mailClaim)) : null)
    }

    render()
    return { unmount() {} }
  }
}
